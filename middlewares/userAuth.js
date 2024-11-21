const User = require('../models/userModel');


const isLogin = async (req, res, next) => {

    try {
        if (req.session.user_id) {

            const userData = await User.findById({ _id: req.session.user_id })
                  
            if (userData.is_admin === 1) {
                return res.render('login', { message: "mid Admins should login using the Admin Login Page !" });
            }
            if (userData.isDeleted === true) {
                return res.render('login', { message: "mid Your account is deleted by the Admin, Cannot Login !" })
            }
            if (userData.status === false) {
                return res.render('login', { message: "mid You are blocked by the Admin, Cannot Login !" })
            }


            next();
        } else {

            res.redirect('/')
            return
        }
    } catch (error) {
        console.log("isUserLogin:" +error.message)
    }
}




const isLogout = async (req, res, next) => {
    try {
        if (req.session.user_id) {

            
            res.redirect('/user_home');
            return;
        }
        else{

            
            next();
        }
      
    } catch (error) {
        console.log("isUserLogout:" +error.message)
    }
}

module.exports = {
    isLogin,
    isLogout
}

