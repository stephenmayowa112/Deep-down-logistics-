const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const webhookCode = `
  // WhatsApp Webhook Verification
  app.get("/api/whatsapp/webhook", (req, res) => {
    const verify_token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    // Parse params from the webhook verification request
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === verify_token) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // WhatsApp Incoming Messages Webhook
  app.post("/api/whatsapp/webhook", (req, res) => {
    const body = req.body;
    
    if (body.object) {
      // Returns a '200 OK' response to all requests
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
    }
  });
`;

content = content.replace('  // Vite middleware for development', webhookCode + '\n  // Vite middleware for development');

fs.writeFileSync('server.ts', content);
