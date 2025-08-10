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

    const labels = data.responses[0].labelAnnotations.map(l => l.description).join(", ");

    const colorsVision = data.responses[0].imagePropertiesAnnotation.dominantColors.colors
      .map(c => ({
        color: `rgb(${c.color.red}, ${c.color.green}, ${c.color.blue})`,
        score: c.score.toFixed(2)
      }));

    const palette = await Vibrant.from(imagePath).getPalette();
    const mainColor = palette.Vibrant ? palette.Vibrant.rgb : [0, 0, 0];

    fs.unlinkSync(imagePath);

    res.json({
      descripcion: labels.split(",")[0],
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
