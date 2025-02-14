import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://230758:cupertino123@f-ank.4cakj.mongodb.net/API-AWI4_0-230758?retryWrites=true&w=majority');
        console.log(' Conexión a MongoDB establecida correctamente');
    } catch (error) {
        console.error(' Error al conectar a MongoDB:', error);
        process.exit(1); 
    }
};

export default connectDB;
