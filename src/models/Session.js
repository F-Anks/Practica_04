import { model, Schema } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone';
import { encryptMacAddress } from './encryption.js';

const getCDMXDateTime = () => {
    return moment().tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss z');
};

const sessionSchema = new Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4()
    },
    email: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        required: true
    },
    clientInfo: {
        ip: String,
        mac: {
            type: String,
            required: true,
            set: function(macAddress) {
                return encryptMacAddress(macAddress);
            }
        }
    },
    serverInfo: {
        ip: String,
        mac: String
    },
    status: {
        type: String,
        enum: ['Activa', 'Inactiva', 'Finalizada', 'Eliminada por Falla de Sistema'],
        default: 'Activa'
    },
    lastAccesed: {
        type: String,
        required: true
    },
    createdAt: {
        type: String,
        required: true,
        default: () => getCDMXDateTime()
    },
    updatedAt: {
        type: String,
        required: true,
        default: () => getCDMXDateTime()
    }
}, {
    versionKey: false
});



sessionSchema.pre('save', function(next) {
    this.updatedAt = moment().tz('America/Mexico_City').format('DD-MM-YYYY HH:mm:ss');
    next();
});



export default model("Session", sessionSchema);