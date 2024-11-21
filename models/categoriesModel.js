const mongoose = require('mongoose');

const categoriesSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,
    },
    categoryImages: {
        type: String,
        default: ""

    },
    categoryDescription: {
        type: String,
        required: true,
    },
    categoryProductsQuantity: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    },



    categoryOfferPercentage: {
        type: Number
    },
    categoryOfferExpiryDate: {
        type: Date
    },
    isCategoryOfferActive: {
        type: Boolean,
    },


});

module.exports = mongoose.model('Category', categoriesSchema);
