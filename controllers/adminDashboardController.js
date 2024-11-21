const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Order = require('../models/orderModel');



// load admin home
const adminHome = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id })

        const ordersData = await Order.find().populate('userId').sort({ orderDate: -1 })
        const usersData = await User.find({ is_admin: 0, isDeleted: false }).sort({ _id: -1 });
        const productsData = await Product.find({ isActive: true }).sort({ _id: -1 });
        const categoriesData = await Category.find({ isDeleted: false }).sort({ _id: -1 });

        const topSellingProducts = await Order.aggregate([
            { $unwind: "$products" }, // Decompose the products array
            {
                $group: {
                    _id: "$products.productId", // Group by productId
                    totalQuantity: { $sum: "$products.quantity" }, // Sum the quantity
                    productName: { $first: "$products.productName" } // Get the product name
                }
            },
            {
                $lookup: {
                    from: "products", // Name of the Product collection
                    localField: "_id", // _id from the current collection
                    foreignField: "_id", // _id from the Product collection
                    as: "productDetails" // Output field name for the joined data
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort by totalQuantity descending
            { $limit: 10 } // Get the top product
        ]);


        const topSellingCategories = await Order.aggregate([
            { $unwind: "$products" }, // Deconstruct the products array
            {
                $lookup: {
                    from: "products", // Reference the Product collection
                    localField: "products.productId", // Match productId from Orders' products array
                    foreignField: "_id", // Match with _id in Product collection
                    as: "productDetails" // Alias for the result set
                }
            },
            { $unwind: "$productDetails" }, // Unwind the productDetails to work with individual product documents
            {
                $lookup: {
                    from: "categories", // Reference the Category collection
                    localField: "productDetails.category", // Match category (string) from Product collection
                    foreignField: "categoryName", // Match with categoryName in Category collection
                    as: "categoryDetails" // Alias for the result set
                }
            },
            { $unwind: "$categoryDetails" }, // Unwind the categoryDetails array to work with the category
            {
                $group: {
                    _id: "$categoryDetails.categoryName", // Group by category name
                    totalQuantity: { $sum: "$products.quantity" }, // Sum the quantities sold for each category
                    categoryImage: { $first: "$categoryDetails.categoryImages" } // Include categoryImage from Category
                }
            },
            { $sort: { totalQuantity: -1 } }, // Sort categories by total quantity sold in descending order
            { $limit: 10 } // Limit to top 10 categories
        ]);



        const totalUsersCount = await User.countDocuments({ is_admin: 0, isDeleted: false });
        const totalCategoriesCount = await Category.countDocuments({ isDeleted: false });
        const totalProductsCount = await Product.countDocuments({ isActive: true });
        let totalSalesCount = 0;
        let totalOrdersAmount = 0;

        // Loop through each order to calculate totals
        ordersData.forEach(order => {
            totalSalesCount++; // Count the order
            totalOrdersAmount += order.totalPrice; // Sum up the total price
        });



        if (userData.is_admin === 1) {
            res.render('admin_home', {
                admin: userData,

                totalSalesCount,
                totalOrdersAmount: totalOrdersAmount.toLocaleString('en-IN'),
                totalProductsCount,
                totalCategoriesCount,
                totalUsersCount,

                topSellingProducts,
                topSellingCategories,

                usersData,
                ordersData,
                productsData,
                categoriesData

            })
        }

    } catch (error) {
        console.log("Error in adminHome:", error.message);
    }
}






//  weekly data
const admin_weekly_data = async (req, res) => {
    try {
        const currentDate = new Date();
        const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);

        const formatWeeklyData = (data, field) => {
            return Array.from({ length: 7 }, (_, index) => {
                const day = index + 1;
                const matchingData = data.find(item => item._id === day);
                return { _id: day, [field]: matchingData ? matchingData[field] : 0 };
            });
        };

        const weeklyOrderData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Completed",
                    orderDate: { $gte: startOfWeek, $lt: endOfWeek }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$orderDate" }, // Group by the day of the week
                    totalOrders: { $sum: 1 } // Count the number of orders
                }
            }
        ]);

        const weeklyUserData = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfWeek, $lt: endOfWeek }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" },
                    userCount: { $sum: 1 }
                }
            }
        ]);

        const formattedWeeklyOrderData = formatWeeklyData(weeklyOrderData, 'totalOrders');
        const formattedWeeklyUserData = formatWeeklyData(weeklyUserData, 'userCount');

        res.json({ weeklyOrderData: formattedWeeklyOrderData, weeklyUserData: formattedWeeklyUserData });
    } catch (error) {
        console.error("Error in admin_weekly_data: ", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// monthly data
const admin_monthly_data = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        // Helper to get start and end of the year
        const getYearRange = (year) => ({
            start: new Date(year, 0, 1),
            end: new Date(year + 1, 0, 1)
        });

        const { start, end } = getYearRange(currentYear);

        // Aggregating orders
        const monthlyOrderData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Completed",
                    orderDate: { $gte: start, $lt: end }
                }
            },
            {
                $group: {
                    _id: { $month: "$orderDate" },
                    totalOrders: { $sum: 1 } // Count the number of orders
                }
            }
        ]);

        // Aggregating user registrations
        const monthlyUserData = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: start, $lt: end }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    userCount: { $sum: 1 }
                }
            }
        ]);

        // Format data
        const allMonths = Array.from({ length: 12 }, (_, index) => index + 1);

        const formatMonthlyData = (rawData, field) =>
            allMonths.map(month => {
                const match = rawData.find(data => data._id === month);
                return { _id: month, [field]: match ? match[field] : 0 };
            });

        const formattedMonthlyOrderData = formatMonthlyData(monthlyOrderData, "totalOrders");
        const formattedMonthlyUserData = formatMonthlyData(monthlyUserData, "userCount");

        // Response
        res.json({
            currentYear,
            monthlyOrderData: formattedMonthlyOrderData,
            monthlyUserData: formattedMonthlyUserData
        });

    } catch (error) {
        console.error("Error inadmin_monthly_data : ", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// current month
const admin_current_month_data = async (req, res) => {
    try {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start of the current month
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); // Start of the next month

        // Aggregating orders for the current month
        const dailyOrderData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Completed",
                    orderDate: { $gte: startOfMonth, $lt: endOfMonth }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$orderDate" },
                    totalOrders: { $sum: 1 } // Count the number of orders
                }
            }
        ]);

        // Aggregating user registrations for the current month
        const dailyUserData = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth, $lt: endOfMonth }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$createdAt" },
                    userCount: { $sum: 1 }
                }
            }
        ]);

        // Get the total number of days in the current month
        const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        // Format data to include all days of the month
        const formatDailyData = (rawData, field) =>
            Array.from({ length: totalDays }, (_, index) => {
                const day = index + 1;
                const match = rawData.find(data => data._id === day);
                return { _id: day, [field]: match ? match[field] : 0 };
            });

        const formattedDailyOrderData = formatDailyData(dailyOrderData, "totalOrders");
        const formattedDailyUserData = formatDailyData(dailyUserData, "userCount");

        // Response
        res.json({
            currentMonth: `${currentDate.toLocaleString("default", { month: "long" })} ${currentDate.getFullYear()}`,
            dailyOrderData: formattedDailyOrderData,
            dailyUserData: formattedDailyUserData
        });

    } catch (error) {
        console.error("Error in admin_current_month_data: ", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};






//   SALES CHART - SMALL



//  week sales data
const admin_week_sales_data = async (req, res) => {
    try {
        const currentDate = new Date();
        const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);

        const formatWeeklyData = (data, field) => {
            return Array.from({ length: 7 }, (_, index) => {
                const day = index + 1;
                const matchingData = data.find(item => item._id === day);
                return { _id: day, [field]: matchingData ? matchingData[field] : 0 };
            });
        };

        const weeklyOrderData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Completed",
                    orderDate: { $gte: startOfWeek, $lt: endOfWeek }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$orderDate" },
                    totalWeeklyPrice: { $sum: "$totalPrice" }
                }
            }
        ]);

        const formattedWeeklyOrderData = formatWeeklyData(weeklyOrderData, 'totalWeeklyPrice');




        res.json({ weeklyOrderData: formattedWeeklyOrderData });
    } catch (error) {
        console.error("Error in admin_week_sales_data: ", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// month sales data
const admin_month_sales_data = async (req, res) => {
    try {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // Start of the current month
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1); // Start of the next month

        // Aggregating orders for the current month
        const dailyOrderData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Completed",
                    orderDate: { $gte: startOfMonth, $lt: endOfMonth }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$orderDate" },
                    totalDailyPrice: { $sum: "$totalPrice" }
                }
            }
        ]);

        // Get the total number of days in the current month
        const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        // Format data to include all days of the month
        const formatDailyData = (rawData, field) =>
            Array.from({ length: totalDays }, (_, index) => {
                const day = index + 1;
                const match = rawData.find(data => data._id === day);
                return { _id: day, [field]: match ? match[field] : 0 };
            });

        const formattedDailyOrderData = formatDailyData(dailyOrderData, "totalDailyPrice");

        // Response
        res.json({
            currentMonth: `${currentDate.toLocaleString("default", { month: "long" })} ${currentDate.getFullYear()}`,
            dailyOrderData: formattedDailyOrderData,
        });

    } catch (error) {
        console.error("Error in admin_month_sales_data: ", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// year sales data
const admin_year_sales_data = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        // Helper to get start and end of the year
        const getYearRange = (year) => ({
            start: new Date(year, 0, 1),
            end: new Date(year + 1, 0, 1)
        });

        const { start, end } = getYearRange(currentYear);

        // Aggregating orders
        const monthlyOrderData = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Completed",
                    orderDate: { $gte: start, $lt: end }
                }
            },
            {
                $group: {
                    _id: { $month: "$orderDate" },
                    totalMonthlyPrice: { $sum: "$totalPrice" }
                }
            }
        ]);

        // Format data
        const allMonths = Array.from({ length: 12 }, (_, index) => index + 1);

        const formatMonthlyData = (rawData, field) =>
            allMonths.map(month => {
                const match = rawData.find(data => data._id === month);
                return { _id: month, [field]: match ? match[field] : 0 };
            });

        const formattedMonthlyOrderData = formatMonthlyData(monthlyOrderData, "totalMonthlyPrice");




        // Response
        res.json({
            currentYear,
            monthlyOrderData: formattedMonthlyOrderData,

        });

    } catch (error) {
        console.error("Error in admin_year_sales_data : ", error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};






module.exports = {
    adminHome,

    admin_weekly_data,
    admin_monthly_data,
    admin_current_month_data,

    admin_week_sales_data,
    admin_month_sales_data,
    admin_year_sales_data
}