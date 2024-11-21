const mongoose = require('mongoose');

const couponsSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        unique: true,
        
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100,
        
    },
    minimumAmount: {
        type: Number,
        
    },
    maximumAmount: {
        type: Number,
        
    },
    couponExpiry: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },

    maxUsesPerUser: {
        type: Number,
        default: 1
    },
    
    redemptionHistory: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'  
            },
            redeemedAt: {
                type: Date,
            }
        }
    ],

});

// Virtual field to check if the coupon is expired
couponsSchema.virtual('isExpired').get(function() {
    return this.couponExpiry < new Date();
});

module.exports = mongoose.model('Coupon', couponsSchema);