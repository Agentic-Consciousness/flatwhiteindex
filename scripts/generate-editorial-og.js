// Rebuild the evergreen sharing image without hard-coding changing survey prices.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const photo = await sharp(
  resolve(root, "public/images/morning-flat-white.webp"),
)
  .resize(510, 570, { fit: "cover", position: "centre" })
  .toBuffer();
const graphic =
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#f7f5ef"/>
<g fill="#292b24"><text x="58" y="77" font-family="Georgia" font-size="29">Flat White Index</text>
<text x="58" y="165" font-family="Arial" font-size="12" letter-spacing="2.3" fill="#34634d">SYDNEY, ONE CUP AT A TIME.</text>
<text x="54" y="260" font-family="Georgia" font-size="65">Your daily ritual.</text>
<text x="54" y="338" font-family="Georgia" font-size="65">A little more</text>
<text x="54" y="416" font-family="Georgia" font-size="65" fill="#b54826">perspective.</text>
<text x="58" y="483" font-family="Arial" font-size="17" fill="#696b60">Real café prices. An open look at your daily cup.</text>
<line x1="58" y1="530" x2="617" y2="530" stroke="#dddfd3"/>
<text x="58" y="572" font-family="Arial" font-size="14" fill="#696b60">flatwhiteindex.com.au</text></g></svg>`);
await sharp(graphic)
  .composite([{ input: photo, left: 660, top: 30 }])
  .png()
  .toFile(resolve(root, "public/og-editorial.png"));
console.log("Generated public/og-editorial.png");
