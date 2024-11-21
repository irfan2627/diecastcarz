const mongoose = require('mongoose')


const addressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  deliveryemail: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  street: {
    type: String,
    required: true,
  },
  addressLine2: {
    type: String,
  },
  zipCode: {
    type: String,
    required: true,
  }
});

const userSchema = new mongoose.Schema({

  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ""
  },
  status: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: true
  },
  is_admin: {
    type: Number,
    required: true,
    default: 0
  },


  token: {
    type: String,
    default: '',
  },
  wallet: {
    type: Number,
    default: 0,
  },
  couponsUsed: {
    type: String
  },


  referralCode: {
    type: String
  },
  isReferralRewardClaimed: {
    type: Boolean
  },
  numberOfReferralsDone: {
    type: Number
  },


  address: [addressSchema]

}, { timestamps: true });


module.exports = mongoose.model('User', userSchema);