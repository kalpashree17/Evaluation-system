import Koa from "koa";
import cors from "@koa/cors";
import bodyParser from "koa-bodyparser";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = new Koa(); //Creates a new Koa application instance.
//note:  middleware order matters a LOT in Koa.
app.use(errorHandler());
app.use(cors()); // allows requests from any origin (frontend on a different port/tunnel URL)
app.use(bodyParser()); // Reads the raw request data (e.g. JSON) and converts it into a JS object at ctx.request.body
app.use(router.routes()); // matches URL + method to your code
app.use(router.allowedMethods());


//This listens for any errors that escape your middleware chain
app.on("error", (err) => {
  console.error("Unhandled error:", err);
});

export default app;
