const mongoose = require('mongoose');

const productsSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  model:{
    type: String,
    required: true,
  },
  brand:{
    type: String,
    required: true,
  },
  scale:{
    type: String,
    required: true
  },
  colour: {
    type: String,
    required: true
  },
    description: {
    type: String,
    required: true
  },
  
  regularPrice: {
    type: Number,
    required: true
  },
  salesPrice: {
    type: Number,
    required: true
  },
   quantity: {
    type: Number,
    required: true,
    default: 1

  },
  category: {
    type: String,
    required:true
  },
  
  productImages: {
    type: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  } ,
  isDeleted:{
    type: Boolean,
    default: false
  },


  productOfferPercentage: {
    type: Number
  },
  isProductOfferActive: {
    type: Boolean
  },
  productOfferExpiryDate: {
    type: Date
  },
  

});

// Create a text index
productsSchema.index({ productName: 'text', description: 'text' });

module.exports = mongoose.model('Product', productsSchema);
