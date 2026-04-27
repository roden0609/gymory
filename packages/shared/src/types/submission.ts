import { z } from "zod";

export type SubmissionType =
  | "add_gym"
  | "edit_gym_info"
  | "add_equipment"
  | "edit_equipment"
  | "remove_equipment"
  | "upload_photo"
  | "delete_gym";

export const submissionSchema = z.object({
  gymId: z.string().uuid().optional(),
  submissionType: z.enum([
    "add_gym",
    "edit_gym_info",
    "add_equipment",
    "edit_equipment",
    "remove_equipment",
    "upload_photo",
    "delete_gym",
  ]),
  payload: z.record(z.unknown()),
});

export type Submission = z.infer<typeof submissionSchema>;
