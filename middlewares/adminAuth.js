const User = require('../models/userModel');

const isLogin = async (req, res, next) => {
    try {

        if (req.session.user_id) {

            const userData = await User.findById({ _id: req.session.user_id })
            if (userData.is_admin === 0) {
                return res.render('admin_login', { message: "mid Users should login using the User Login Page !" });

            }

            next();


        } else {
            res.redirect('/admin')
            return
        }
    } catch (error) {
        console.log("isAdminLogin:" + error.message);
    }
}

const isLogout = async (req, res, next) => {
    try {
  
        if (req.session.user_id) {
            res.redirect('/admin/admin_home')
            return;
        }else{
            next();
        }
      
    } catch (error) {
        console.log("isAdminLogout: " + error.message);
    }
}

module.exports = {
    isLogin,
    isLogout
}