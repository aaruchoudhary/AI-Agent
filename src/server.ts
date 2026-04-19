import { createApp } from "./app";
import { config } from "./core/config";

const app = createApp();

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI testing agent running on http://localhost:${config.port}`);
});
