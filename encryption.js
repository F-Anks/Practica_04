import crypto from 'crypto';


// Generar claves RSA para encriptar y desencriptar la dirección MAC
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

export const encryptMacAddress = (macAddress) => {
    try {
        const encryptedData = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            Buffer.from(macAddress)
        );
        
        return encryptedData.toString('base64');
    } catch (error) {
        console.error('Error encrypting macAddress:', error);
        throw new Error('Error al encriptar la dirección MAC');
    }
};

export const decryptMacAddress = (encryptedMacAddress) => {
    try {
        const decryptedData = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            Buffer.from(encryptedMacAddress, 'base64')
        );
        
        return decryptedData.toString();
    } catch (error) {
        console.error('Error decrypting macAddress:', error);
        throw new Error('Error al desencriptar la dirección MAC');
    }
};