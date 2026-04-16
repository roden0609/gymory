import { z } from "zod";

export const searchParamsSchema = z.object({
  district: z.string().optional(),
  minRackCount: z.coerce.number().min(0).optional(),
  minDumbbellWeight: z.coerce.number().min(0).optional(),
  hasAssaultBike: z.string().optional(),
  hasSkiErg: z.string().optional(),
  hasRower: z.string().optional(),
  hasSled: z.string().optional(),
  hasWallBall: z.string().optional(),
  minSize: z.coerce.number().min(0).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
