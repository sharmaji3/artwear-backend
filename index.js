const express = require("express");
const axios = require("axios");
require("dotenv").config();
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cors());


const SHOPIFY_STORE = 'kkgsk1-pk.myshopify.com';
const ACCESS_TOKEN = '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';
const TEMPLATE_PRODUCT_ID = '8942598619369';


app.post("/generate-image", async (req, res) => {
  const { prompt, numImages = 4 } = req.body;

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
        num_images: numImages,
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

    let imageUrls = [];
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
        imageUrls = imageData.generated_images.map(img => img.url);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (imageUrls.length > 0) {
      res.json({ imageUrls });
    } else {
      res.status(202).json({ message: "Image generation in progress. Try again later." });
    }
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Image generation failed." });
  }
});




app.get("/template-product-variants", async (req, res) => {
  try {
    const response = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2025-04/products/${TEMPLATE_PRODUCT_ID}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const { variants, options } = response.data.product;

    // Fetch store currency
    const shopResponse = await axios.get(
      `https://${SHOPIFY_STORE}/admin/api/2025-04/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    const storeCurrency = shopResponse.data.shop.currency;
  console.log("Store Currency:", currencyCode);
    

    res.json({ variants, options, storeCurrency });
  } catch (error) {
    console.error("Error fetching template variants:", error.message);
    res.status(500).send("Failed to load variants");
  }
});


app.post("/create-product", async (req, res) => {
  try {
    const { title, body_html, vendor, product_type, images, variants, options } = req.body;

    const productPayload = {
      title,
      body_html,
      vendor,
      product_type,
      images,
      variants,
      options
    };

    const response = await axios.post(
      `https://${SHOPIFY_STORE}/admin/api/2025-04/products.json`,
      { product: productPayload },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("Shopify API error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error creating product",
      details: error.response?.data || error.message
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});