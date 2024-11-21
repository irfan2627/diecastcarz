// multerConfig.js
const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, './public/user_images'))
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name)
    }
})


const upload = multer({ storage: storage })

const productImages = multer({ dest: './public/product_images' });
const categoryImages = multer({ dest: './public/category_images' });






module.exports = {
  upload,
  productImages,
  categoryImages,
  
  
};
