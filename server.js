import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import * as Vibrant from "node-vibrant";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(express.static("public"));

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo." });
    }

    const imagePath = path.resolve(req.file.path);
    const imageBase64 = fs.readFileSync(imagePath).toString("base64");

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "IMAGE_PROPERTIES", maxResults: 1 }
              ]
            }
          ]
        })
      }
    );

    const data = await visionRes.json();

    const labelsAnnotation = data.responses[0]?.labelAnnotations;
    const labels = labelsAnnotation ? labelsAnnotation.map(l => l.description).join(", ") : "No se encontraron etiquetas";
    const descripcion = labelsAnnotation ? labelsAnnotation[0].description : "Sin descripción";

    const dominantColors = data.responses[0]?.imagePropertiesAnnotation?.dominantColors?.colors;
    const colorsVision = dominantColors ? dominantColors : [];

    let mainColor = [0, 0, 0];
    try {
      const palette = await Vibrant.from(imagePath).getPalette();
      if (palette && palette.Vibrant && palette.Vibrant.rgb) {
        mainColor = palette.Vibrant.rgb;
      }
    } catch (vibrantError) {
      console.error("Error al extraer color con node-vibrant:", vibrantError);
    }
    
    fs.unlinkSync(imagePath);

    res.json({
      descripcion: descripcion,
      etiquetas: labels,
      colores_predominantes: colorsVision,
      color_principal: `rgb(${mainColor[0]}, ${mainColor[1]}, ${mainColor[2]})`
    });
  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(500).json({ error: "Error al procesar la imagen" });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));