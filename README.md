This contains everything you need to run this app locally.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## WhatsApp Status Notifications

When an admin marks a shipment **Shipped** in the Admin Dashboard, the app automatically sends the client a WhatsApp message containing their packing-list details (Shipping Mark, Container ID, Quantity, Volume, Freight, Clearing), rendered as an image and sent through Meta's WhatsApp Cloud API. No other status change sends anything.

### Setup

1. Set up a Meta WhatsApp Business Cloud API account (App Dashboard → Business Portfolio → add the WhatsApp product).
2. Add the following to your `.env.local`:
   - `WHATSAPP_TOKEN` — access token (use a permanent System User token in production; the temporary token from API Setup expires after 24 hours)
   - `WHATSAPP_PHONE_NUMBER_ID` — Phone Number ID from API Setup
   - `WHATSAPP_PACKING_LIST_TEMPLATE_NAME` — defaults to `shipment_status_update_image`
3. In WhatsApp Manager → Message Templates, submit an image-header template (a static caption, no body `{{variables}}` — all the client's details are drawn directly into the image at send time). Wait for it to reach **Active** status.

### How it works

- Only a change to the **Shipped** status triggers a notification — other status changes update Firestore/the tracking timeline as usual but do not message the client.
- `src/utils/packingListImageGenerator.ts` renders the shipment's packing-list details onto a canvas client-side, mirroring the "GUANGZHOU PACKING LIST" layout from `generateClientManifestPDF()` in `src/utils/pdfGenerator.ts`. The resulting PNG is base64-encoded and POSTed to `/api/send-packing-list-image`.
- The server uploads those bytes to WhatsApp's Media API to get a `media_id`, then sends the approved template with that id as the image header parameter — Meta only approves the template's format, not the per-shipment pixel content.
- Sending happens via a 5-second delayed toast with an **Undo** option in the Admin Dashboard, so an accidental status change can be caught before the message actually goes out.
- If `WHATSAPP_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` isn't configured, notifications are silently skipped (logged as a warning) — this won't block or break the underlying status update.
- The older text-only template flow (`sendWhatsAppStatusUpdate` / `POST /api/notify-status` / `WHATSAPP_TEMPLATE_NAME`) still exists in `server.ts` and works if called directly, but the Admin Dashboard no longer triggers it — it's been superseded by the packing-list image for the Shipped notification.

### Known gap / TODO

- Freight is not yet shown as a column on the Admin Dashboard table — only in the WhatsApp packing-list image and PDF receipt. Adding it as a dashboard column (with proper currency formatting, and a decision on whether to also show the clearing fee) is still open.
