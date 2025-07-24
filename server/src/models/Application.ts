import { Schema, model, Types } from 'mongoose';

const applicationSchema = new Schema({
    job: { type: Types.ObjectId, ref: 'Job', required: true },
    user: { type: Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['BOOKMARKED', 'APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED'],
        default: 'BOOKMARKED'
    },
    generatedCoverLetter: { type: String }
}, { timestamps: true });

export const Application = model('Application', applicationSchema);