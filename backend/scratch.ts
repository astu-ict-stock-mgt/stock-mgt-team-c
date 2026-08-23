import app from "./src/app";
import request from "supertest";

async function run() {
  console.log("Registered routes in app:");
  app._router.stack.forEach((r: any) => {
    if (r.route && r.route.path) {
      console.log(r.route.path);
    } else if (r.name === 'router') {
      console.log("Router mounted on:", r.regexp);
    }
  });

  const res = await request(app).post("/api/v1/goods-receipts").send({});
  console.log("Response:", res.status, res.body);
}

run().catch(console.error);
