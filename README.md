This contains everything you need to run this app locally.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## WhatsApp Status Notifications

When an admin changes a shipment's status in the Admin Dashboard, the app can automatically send a WhatsApp message to the client with their shipment details (Shipping Mark, Tracking ID, Container ID, Quantity, Volume, Freight, Status).

### Setup

1. Set up a Meta WhatsApp Business Cloud API account (App Dashboard → Business Portfolio → add the WhatsApp product).
2. Add the following to your `.env.local`:
   - `WHATSAPP_TOKEN` — access token (use a permanent System User token in production; the temporary token from API Setup expires after 24 hours)
   - `WHATSAPP_PHONE_NUMBER_ID` — Phone Number ID from API Setup
   - `WHATSAPP_TEMPLATE_NAME` — defaults to `shipment_status_update`
3. Create and submit a message template in WhatsApp Manager → Message Templates, using **Named** parameter format, matching the following body exactly (parameter names are case-sensitive and must match what's in `server.ts`):

   ```
   DEEP DOWN LOGISTICS
   Shipment Update

   Here are the details of your shipment:
   Shipping Mark: {{shipping_mark}}
   Tracking ID: {{tracking_id}}
   Container ID: {{container_id}}
   Quantity: {{ctn}} CTN
   Volume: {{cbm}} CBM
   Freight: {{freight}}
   Status: {{status}}

   Contact us for any questions. Thank you for choosing Deep Down Logistics.
   ```

4. Wait for the template to reach **Active** status (templates cannot be sent while "In Review").

### How it works

- Every shipment status change triggers a notification — this is intentional, per client requirements, not a bug.
- Sending happens via a 5-second delayed toast with an **Undo** option in the Admin Dashboard, so an accidental status change can be caught before the message actually goes out.
- The `freight` value is calculated server-side as `cbm × freight_usd_per_cbm`, using the same formula as the PDF receipt generator (`src/utils/pdfGenerator.ts`), so the two always match. If a shipment has no freight rate set yet, the message shows "Not yet quoted" instead of a blank value.
- If `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` isn't configured, notifications are silently skipped (logged as a warning) — this won't block or break the underlying status update.

### Known gap / TODO

- Freight is not yet shown as a column on the Admin Dashboard table — only in the WhatsApp message and PDF receipt. Adding it as a dashboard column (with proper currency formatting, and a decision on whether to also show the clearing fee) is still open.
