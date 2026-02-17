import { httpRouter } from "convex/server";
import { postVoice } from "./voiceHttp";

const http = httpRouter();

http.route({
  path: "/api/voice",
  method: "POST",
  handler: postVoice,
});

http.route({
  path: "/api/voice",
  method: "OPTIONS",
  handler: postVoice,
});

export default http;
