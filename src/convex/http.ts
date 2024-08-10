import { httpRouter } from "convex/server";
import { postMessage } from "./message";

const http = httpRouter();

http.route({
    path: "/postMessage",
    method: "GET",
    handler: postMessage,
});

// Convex expects the router to be the default export of `convex/http.js`.
export default http;