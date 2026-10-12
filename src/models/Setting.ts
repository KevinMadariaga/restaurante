import { model, models, Schema, type Model } from "mongoose";

/** Configuración general del restaurante: un único documento con _id "general". */
const schema = new Schema({ _id: String, tableCount: Number }, { timestamps: true });

export const Setting = (models.Setting as Model<{ _id: string; tableCount?: number }>) ?? model("Setting", schema);
