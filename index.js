const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Built-in middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/generate-image", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const response = await axios.post(
      "https://cloud.leonardo.ai/api/rest/v1/generations",
      {
        prompt,
        width: 512,
        height: 512,
        num_images: 1,
        guidance_scale: 7,
        num_inference_steps: 20,
        promptMagic: true
      },
      {
        headers: {
          "Authorization": `Bearer a00319bb-1705-410a-a3e6-e5985bd02ac2`,
          "Content-Type": "application/json"
        }
      }
    );

    const generationId = response.data.sdGenerationJob.generationId;

    let imageUrl = null;
    for (let i = 0; i < 10; i++) {
      const genRes = await axios.get(
        `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
        {
          headers: {
            "Authorization": `Bearer a00319bb-1705-410a-a3e6-e5985bd02ac2`
          }
        }
      );

      const imageData = genRes.data.generations_by_pk;
      if (imageData && imageData.generated_images.length > 0) {
        imageUrl = imageData.generated_images[0].url;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(202).json({ message: "Image generation in progress. Try again later." });
    }
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Image generation failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});