import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "./auth.js";
import {
  DEFAULT_OVERVIEW_LAYOUT,
  normalizeOverviewLayout,
  overviewLayoutSchema,
} from "../lib/overview-layout.js";

type Variables = { userId: string };

export const settingsRoutes = new Hono<{ Variables: Variables }>();

settingsRoutes.use("*", requireAuth);

const aiInstructionsSchema = z.object({
  instructions: z.string().max(2000),
});
settingsRoutes.get("/ai", async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { aiInstructions: true },
  });
  return c.json({ instructions: user.aiInstructions });
});

settingsRoutes.patch("/ai", async (c) => {
  const userId = c.get("userId");
  const body = aiInstructionsSchema.parse(await c.req.json());

  await prisma.user.update({
    where: { id: userId },
    data: { aiInstructions: body.instructions.trim() },
  });

  return c.json({ instructions: body.instructions.trim() });
});

settingsRoutes.get("/overview", async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { overviewLayout: true },
  });

  const layout = normalizeOverviewLayout(user.overviewLayout ?? DEFAULT_OVERVIEW_LAYOUT);
  return c.json(layout);
});

settingsRoutes.patch("/overview", async (c) => {
  const userId = c.get("userId");
  const body = overviewLayoutSchema.parse(await c.req.json());
  const layout = normalizeOverviewLayout(body);

  await prisma.user.update({
    where: { id: userId },
    data: { overviewLayout: layout },
  });

  return c.json(layout);
});
