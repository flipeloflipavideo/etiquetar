import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import ColorThief from "color-thief";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(express.static("public"));

// Subida y análisis de imagen
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const imagePath = path.resolve(req.file.path);

    // Convertir imagen a base64 para Google Vision
    const imageBase64 = fs.readFileSync(imagePath).toString("base64");

    // Llamar a Google Cloud Vision API
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

    // Obtener etiquetas
    const labels = data.responses[0].labelAnnotations.map(l => l.description).join(", ");

    // Colores predominantes desde Google Vision
    const colorsVision = data.responses[0].imagePropertiesAnnotation.dominantColors.colors
      .map(c => ({
        color: `rgb(${c.color.red}, ${c.color.green}, ${c.color.blue})`,
        score: c.score.toFixed(2)
      }));

    // Color principal con Color Thief (más preciso)
    const colorThief = new ColorThief();
    const mainColor = colorThief.getColor(imagePath);

    // Borrar imagen subida después de procesar
    fs.unlinkSync(imagePath);

    res.json({
      descripcion: labels.split(",")[0], // primera etiqueta como descripción
      etiquetas: labels,
      colores_predominantes: colorsVision,
      color_principal: `rgb(${mainColor[0]}, ${mainColor[1]}, ${mainColor[2]})`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al procesar la imagen" });
  }
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
