const User = require('../models/userModel');
const Product = require('../models/productsModel');
const Category = require('../models/categoriesModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Coupon = require('../models/couponsModel');

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');





function generateOrderId() {
    return 'ORD' + Date.now();
}


// user_order_placed
const user_order_placed = async (req, res) => {
    try {

        const userData = await User.findById({ _id: req.session.user_id })

        const {
            productId,
            productQuantity,
            productName,
            productQuantityTotal,
            allSubtotal,
            address_selection,
            payment_option,
            couponApplied,
            totalSum
        } = req.body;

        console.log("\n totalSum is : ", totalSum);
        console.log("\n allSubtotal is : ", allSubtotal);

        // discounts
        const discountAmount = Math.round(totalSum - allSubtotal)
        console.log("\n Discount Amount is: ", discountAmount + "%");

        const discountPercentage = Math.round(((totalSum - allSubtotal) / totalSum) * 100)
        console.log("\n Discount Percentage is: ", discountPercentage + "%");


        const addressIndex = parseInt(address_selection, 10);
        const userAddress = userData.address && userData.address[addressIndex] || {};

        const paymentStatus = (payment_option === 'RazorPay' || payment_option === 'Wallet') ? 'Completed' : 'Pending';
        const productPaymentStatus = (payment_option === 'RazorPay' || payment_option === 'Wallet') ? 'Completed' : 'Pending';

        console.log('\n payment option is : ', payment_option);
        console.log('\n payment status is : ', paymentStatus);
        console.log('\n productPaymentStatus  is : ', productPaymentStatus);


        // Creating order
        const products = Array.isArray(productId)
            ? productId.map((id, index) => ({
                productId: id,
                productName: productName[index] || '',
                quantity: parseInt(productQuantity[index], 10),
                price: parseInt(productQuantityTotal[index], 10),
                productPaymentStatus: productPaymentStatus
            }))
            : {
                // For a single product
                productId: productId,
                productName: productName,
                quantity: productQuantity,
                price: productQuantityTotal,
                productPaymentStatus: productPaymentStatus
            };

        const newOrder = new Order({
            userId: userData,
            products,
            orderid: generateOrderId(),
            orderDate: new Date(),
            totalPrice: allSubtotal,
            orderStatus: 'Order Placed',
            paymentMethod: payment_option,
            paymentStatus: paymentStatus,
            address: userAddress,
            totalSum: totalSum,
            discountPercentage: discountPercentage

        });


        const savedOrder = await newOrder.save();

        if (savedOrder) {

            // coupon updation
            if (couponApplied) {
                console.log("\n couponApplied is :", couponApplied);

                // Update the coupon's redemption history by adding the user who redeemed it
                const updatingCouponData = {
                    $push: {
                        redemptionHistory: {
                            userId: userData._id.toString(),
                            redeemedAt: Date.now(),
                        },
                    },
                };

                const updatedCouponData = await Coupon.findOneAndUpdate(
                    { couponCode: couponApplied }, // Search for the coupon by code
                    updatingCouponData, // Update the redemption history
                    { new: true } // Return the updated coupon data
                );

                // Optionally, you can log the updated coupon data for debugging
                console.log("Updated Coupon Data:", updatedCouponData);
            }

            // Reducing the money from the wallet
            if (payment_option === 'Wallet') {
                const walletUpdate = await User.findByIdAndUpdate(userData._id, {
                    $set: { wallet: userData.wallet - allSubtotal },
                    $push: {
                        walletHistory: {
                            amount: allSubtotal,
                            type: 'debit',
                            description: 'Order Payment',
                            timestamp: new Date(),
                        }
                    }
                }, { new: true });

                if (!walletUpdate) {
                    throw new Error('Failed to update wallet and wallet history')
                }

            }


            // Clearing cart
            await Cart.findOneAndUpdate({ userId: userData }, { $set: { products: [] } });


            // Quantity updation
            const updateProductQuantities = async (id, quantity) => {
                const product = await Product.findById(id);
                if (product) {
                    const updatedQuantity = product.quantity - parseInt(quantity, 10);
                    await Product.findByIdAndUpdate(id, { $set: { quantity: updatedQuantity } });
                }
            };
            if (Array.isArray(productId)) {
                // For many products
                for (let i = 0; i < productId.length; i++) {
                    await updateProductQuantities(productId[i], productQuantity[i]);
                }
            } else {
                // For a single product
                await updateProductQuantities(productId, productQuantity);
            }

            console.log("ORDER PLACED SUCCESSFULLY");

        } else {
            console.log("ORDER FAILED");
        }

        res.redirect('user_home');

    } catch (error) {
        console.log("Error in user_order_placed : ", error.message);
        res.status(500).send('Internal Server Error');
    }
}


// view order details
const user_order_details = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const orderDetails = await Order.find({ orderid: orderId });
        const productDetails = await Product.find({ isActive: true });
        const userData = req.session.user_id
        const categories = await Category.find({ isActive: true })
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_order_details', { user: userData, cart, categories, ordersData: orderDetails, productDetails: productDetails });
    } catch (error) {
        console.error('Error in user_order_details:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


// cancel order page
const user_cancel_order_page = async (req, res) => {
    try {
        const cancelOrderId = req.query.orderId;
        const productId = req.query.productId
        const userData = req.session.user_id
        const categories = await Category.find({ isActive: true })
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }


        res.render('user_cancel_order', { cart, categories, cancelOrderId: cancelOrderId, productId: productId, user: userData });
    } catch (error) {
        console.error('Error in user_cancel_order_page:', error.message);
    }
};


// cancel order
const user_cancel_order = async (req, res) => {
    try {
        console.log("order is cancelling.....");

        const userData = await User.findById({ _id: req.session.user_id })
        const userId = userData._id
        const username = userData.username

        const reason = req.body.reason;
        const productId = req.body.productId;
        const cancelOrderId = req.body.cancelOrderId;


        const orderData = await Order.findOne({ orderid: cancelOrderId });
        console.log("\n Order Data Got");

        const productData = orderData.products.find(product => product._id.toString() === productId);
        console.log("\n productData is : ", productData);

        const ProductPrice = productData.price
        console.log("\n ProductPrice is : ", ProductPrice);

        const discount = orderData.discountPercentage
        console.log("\n discountPercentage is : ", orderData.discountPercentage);
        console.log("\n discount is : ", discount);

        const refundedAmount = Math.round(ProductPrice - (ProductPrice * (discount / 100)))
        console.log("\n discountPercentageprice is : ", ProductPrice * (discount / 100));
        console.log("\n refundedAmount is : ", refundedAmount);



        const updatedOrder = await Order.findOneAndUpdate(
            {
                orderid: cancelOrderId,
                'products._id': productId
            },
            {
                $set: {
                    'products.$.productCancelReason': reason,
                    'products.$.productCancelDate': new Date(),
                    'products.$.productPaymentStatus': 'Refunded',
                    'products.$.productStatus': 'Cancelled',
                    'products.$.refundedAmount': refundedAmount,
                },
            },
            { new: true }
        );

        const updatedOrder2 = await Order.findOneAndUpdate(
            {
                orderid: cancelOrderId,
            },
            {
                $set: {
                    orderStatus: 'Multiple Statuses'
                },
            },
            { new: true }
        );

        // wallet update
        if (orderData?.paymentMethod === 'RazorPay' || orderData?.paymentMethod === 'Wallet') {
            console.log('wallet updatingWallet...');

            const walletAmountRefund = userData.wallet + refundedAmount

            const updatingWallet = await User.findByIdAndUpdate(
                userData._id,
                {
                    $set: { wallet: walletAmountRefund },
                    $push: {
                        walletHistory: {
                            amount: refundedAmount,
                            type: 'credit',
                            description: 'Refund Payment',
                            timestamp: new Date(),
                        }

                    }
                }, { new: true });

            if (updatingWallet) {
                console.log("WALLET UPDATED");
            } else {
                console.log("Failed to update wallet");
            }

        } else { console.log('wallet not updating') }


        // product quantity update
        const productDetails = updatedOrder.products.find(product => product._id == productId);
        if (productDetails) {
            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: productDetails.quantity },
            });
            console.log("order is CANCELLED");
        }

        const userDatas = await User.findById(userId)
        const categories = await Category.find({ isActive: true });
        const productsData = await Product.find({ isActive: true });
        const ordersData = await Order.find({ userId: userDatas._id });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', {
            message: `Order cancelled successfully. `,
            user: userDatas,
            categories,
            productsData,
            ordersData,
            cart,
            username
        });


    } catch (error) {
        console.log('Error in user_cancel_order:', error.message);
        res.status(500).send('Internal Server Error');


    }
}


// user_return_order_page
const user_return_order_page = async (req, res) => {
    try {
        const userData = await User.findById({ _id: req.session.user_id })
        const username = userData.username
        const returnOrderId = req.query.orderId;
        const productId = req.query.productId
        const categories = await Category.find({ isActive: true });
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_return_order_page', { cart, categories, returnOrderId: returnOrderId, productId: productId, userData, username });
    } catch (error) {
        console.error('Error in user_return_order_page:', error.message);
    }
};


// user_return_order
const user_return_order = async (req, res) => {
    try {
        console.log("order is returning.....");



        const userData = await User.findById({ _id: req.session.user_id })
        const userId = userData._id
        const username = userData.username
        const reason = req.body.reason;
        const productId = req.body.productId;
        const returnOrderId = req.body.returnOrderId;

        const orderData = await Order.findOne({ orderid: returnOrderId });
        console.log("\n Order Data Got");

        const productData = orderData.products.find(product => product._id.toString() === productId);
        console.log("\n productData is : ", productData);

        const ProductPrice = productData.price
        console.log("\n ProductPrice is : ", ProductPrice);

        const discount = orderData.discountPercentage
        console.log("\n discountPercentage is : ", orderData.discountPercentage);
        console.log("\n discount is : ", discount);

        const refundedAmount = Math.round(ProductPrice - (ProductPrice * (discount / 100)))
        console.log("\n discountPercentageprice is : ", ProductPrice * (discount / 100));
        console.log("\n refundedAmount is : ", refundedAmount);


        const updatedOrder = await Order.findOneAndUpdate(
            {
                orderid: returnOrderId,
                'products._id': productId //using positional opertr
            },
            {
                $set: {
                    'products.$.productCancelReason': reason,
                    'products.$.productCancelDate': new Date(),
                    'products.$.productPaymentStatus': 'Refunded',
                    'products.$.productStatus': 'Returned',
                    'products.$.refundedAmount': refundedAmount,
                },
            },
            { new: true }
        );

        const updatedOrder2 = await Order.findOneAndUpdate(
            {
                orderid: returnOrderId,
            },
            {
                $set: {
                    orderStatus: 'Multiple Statuses'
                },
            },
            { new: true }
        );


        // wallet update
        if (orderData?.paymentMethod === 'RazorPay' || orderData?.paymentMethod === 'Wallet') {
            console.log('wallet updatingWallet...');

            const walletAmountRefund = userData.wallet + refundedAmount
            const updatingWallet = await User.findByIdAndUpdate(
                userData._id,
                {
                    $set: { wallet: walletAmountRefund },
                    $push: {
                        walletHistory: {
                            amount: refundedAmount,
                            type: 'credit',
                            description: 'Refund Payment',
                            timestamp: new Date(),
                        }

                    }
                }, { new: true });

            if (updatingWallet) {
                console.log("WALLET UPDATED");
            } else {
                console.log("Failed to update wallet");
            }
        } else { console.log('wallet not updating') }


        // product quantity update
        const productDetails = updatedOrder.products.find(product => product._id == productId);
        if (productDetails) {
            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: productDetails.quantity },
            });
            console.log("order is RETURNED");
        }

        const userDataToSent = await User.findById(userId)
        const categories = await Category.find({});
        const productsData = await Product.find({});
        const ordersData = await Order.find({ userId: userData._id });
        let cart = await Cart.findOne({ userId: userData._id }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        res.render('user_account', {
            message: `Order returned successfully. `,
            user: userDataToSent,
            categories,
            productsData,
            ordersData,
            username,
            cart
        });

    } catch (error) {
        console.error('Error in orderController - returnOrderProcess:', error.message);
    }
};






///////////////////////////

///     A D M I N

///////////////////////////



// admin_orders_list

const admin_orders_list = async (req, res) => {
    try {
        const ordersListSearch = req.query.ordersListSearch || '';
        const orderStatus = req.query.orderStatus || '';
        const ordersListPage = parseInt(req.query.ordersListPage, 10) || 1;
        const ordersListPageLimit = 5;



        // Building the search query
        let ordersResultData = {
            $or: [
                { orderid: { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
                { "address.firstName": { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
                { "address.lastName": { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
                { "address.deliveryemail": { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
                { "address.phone": { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
                { "address.zipCode": { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
                { "products.productName": { $regex: '.*' + ordersListSearch + '.*', $options: 'i' } },
            ]
        };



        // Add the order status filter only if it's selected
        if (orderStatus) {
            ordersResultData["products.productStatus"] = orderStatus;
        }

        // Fetch the filtered and paginated data
        const ordersData = await Order.find(ordersResultData)
            .populate('userId')
            .limit(ordersListPageLimit)
            .skip((ordersListPage - 1) * ordersListPageLimit)
            .sort({ $natural: -1 })
            .exec();




        // Get total count for pagination
        const ordersListPageCount = await Order.countDocuments(ordersResultData);

        // Ensure current page is within bounds
        const totalPages = Math.ceil(ordersListPageCount / ordersListPageLimit);
        const currentPage = Math.min(Math.max(ordersListPage, 1), totalPages);

        res.render('admin_orders_list', {
            allOrders: ordersData,
            orderStatus,
            ordersListTotalPages: totalPages,
            ordersListCurrentPage: currentPage,
            ordersListSearch
        });

    } catch (error) {
        console.error('Error in admin_orders_list:', error.message);
        res.status(500).send('Internal Server Error');
    }
};



// admin_change_order_status
const admin_change_order_status = async (req, res) => {
    try {
        const newStatus = req.query.productStatus;
        const orderId = req.query.orderId;
        const productId = req.query.productId;


        const orderData = await Order.findOneAndUpdate(
            { _id: orderId, 'products._id': productId },
            { $set: { 'products.$.productStatus': newStatus } },
            { new: true }
        );

        if (!orderData) {
            return res.status(404).send('Order not found');
        }

        const cancelledProduct = orderData.products.find(product => product._id == productId);
        const quantityToAddBack = cancelledProduct ? cancelledProduct.quantity : 0;

        if (newStatus == "Delivered") {
            await Order.findOneAndUpdate(
                { _id: orderId, 'products._id': productId },
                {
                    $set: {
                        paymentStatus: 'Completed',
                        orderStatus: 'Delivered',
                        'products.$.productPaymentStatus': "Completed"
                    }
                },
                { new: true }
            );

        } else if (newStatus == "Returned") {
            await Order.findOneAndUpdate(
                { _id: orderId, 'products._id': productId },
                {
                    $set: {
                        'products.$.productCancelDate': new Date(),
                        'products.$.productPaymentStatus': 'Refunded',
                    }
                },
                { new: true }
            );

            // Update the product quantity in the product collection
            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: quantityToAddBack },
            });

        } else if (newStatus == "Shipped" || newStatus == "Order Placed") {
            await Order.findOneAndUpdate(
                { _id: orderId, 'products._id': productId },
                {
                    $set: {
                        'products.$.productCancelDate': null,
                        'products.$.productPaymentStatus': 'Pending',

                    }
                },
                { new: true }
            );
        }



        res.redirect('admin_orders_list');
    } catch (error) {
        console.error('Error in admin_change_order_status:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// admin_individual_order_page
const admin_individual_order_page = async (req, res) => {
    try {
        const ordersIndividualId = req.query.ordersIndividualId
        const ordersData = await Order.findById(ordersIndividualId)
        const productDetails = await Product.find({})

        // console.log("ordersdata: ", ordersData)

        res.render('admin_individual_order_page', { ordersData: ordersData, productDetails: productDetails })
    } catch (error) {
        console.error('Error in admin_individual_order_page:', error.message);
        res.status(500).send('Internal Server Error');
    }
}

// admin_individual_order_cancel_page
const admin_individual_order_cancel_page = async (req, res) => {
    try {
        const cancelOrderId = req.query.orderId;
        const productId = req.query.productId

        const orderDetails = await Order.findOne({ orderid: cancelOrderId });

        res.render('admin_individual_order_cancel_page', { cancelOrderId: cancelOrderId, productId: productId });
    } catch (error) {
        console.error('Error in admin_individual_order_cancel_page:', error.message);
    }
};


// admin_individual_order_cancel
const admin_individual_order_cancel = async (req, res) => {
    try {


        const reason = req.body.reason;
        const productId = req.body.productId;
        const cancelOrderId = req.body.cancelOrderId;

        const orderData = await Order.findOne({ orderid: cancelOrderId });
        console.log("\n Order Data Got");

        const productData = orderData.products.find(product => product._id.toString() === productId);
        console.log("\n productData is : ", productData);

        const ProductPrice = productData.price
        console.log("\n ProductPrice is : ", ProductPrice);

        const discount = orderData.discountPercentage
        console.log("\n discountPercentage is : ", orderData.discountPercentage);
        console.log("\n discount is : ", discount);

        const refundedAmount = Math.round(ProductPrice - (ProductPrice * (discount / 100)))
        console.log("\n discountPercentageprice is : ", ProductPrice * (discount / 100));
        console.log("\n refundedAmount is : ", refundedAmount);


        const updatedOrder = await Order.findOneAndUpdate(
            {
                orderid: cancelOrderId,
                'products._id': productId //using positional opertr
            },
            {
                $set: {
                    'products.$.productCancelReason': reason,
                    'products.$.productCancelDate': new Date(),
                    'products.$.productPaymentStatus': 'Refunded',
                    'products.$.productStatus': 'Cancelled',
                    'products.$.refundedAmount': refundedAmount,
                },
            },
            { new: true }
        );

        const updatedOrder2 = await Order.findOneAndUpdate(
            {
                orderid: cancelOrderId,
            },
            {
                $set: {
                    orderStatus: 'Multiple Statuses'
                },
            },
            { new: true }
        );

        // wallet update
        const userData = await User.findById(orderData.userId)
        console.log(userData);

        if (orderData?.paymentMethod === 'RazorPay' || orderData?.paymentMethod === 'Wallet') {
            console.log('wallet updatingWallet...');

            const walletAmountRefund = userData.wallet + refundedAmount
            const updatingWallet = await User.findByIdAndUpdate(
                userData._id,
                {
                    $set: { wallet: walletAmountRefund },
                    $push: {
                        walletHistory: {
                            amount: refundedAmount,
                            type: 'credit',
                            description: 'Refund Payment',
                            timestamp: new Date(),
                        }

                    }
                }, { new: true });

            if (updatingWallet) {
                console.log("WALLET UPDATED");
            } else {
                console.log("Failed to update wallet");
            }

        } else { console.log('wallet not updating') }


        // product quantity update
        const productDetails = updatedOrder.products.find(product => product._id == productId);
        if (productDetails) {
            await Product.findByIdAndUpdate(productId, {
                $inc: { quantity: productDetails.quantity },
            });
        }


        res.redirect('admin_orders_list');

    } catch (error) {
        console.error('Error in admin_individual_order_cancel:', error.message);
        res.status(500).send('Internal Server Error');
    }
};




//////////////////
// USER INOICE
/////////////////

// user_invoice_download
const user_invoice_download = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        const orderDetails = await Order.find({ orderid: orderId });
        const productDetails = await Product.find({ isActive: true });
        const userData = req.session.user_id
        const categories = await Category.find({ isActive: true })
        let cart = await Cart.findOne({ userId: userData }).populate(
            'products.productId'
        );
        if (!cart) {
            cart = new Cart({ userId: userData, products: [] });
        }

        const result = await exportOrderToPDF(orderId);  // This will generate and save the PDF

        if (result.success) {
            console.log('pdf is generated successsfully');

            res.download(result.filePath);  // Trigger PDF download
        } else {
            console.log('pdf generate failed');

            res.status(404).send(result.message);  // Handle error
        }


    } catch (error) {
        console.error('Error in user_invoice_download:', error.message);
        return res.status(404).render('404', { message: error.message, error: error.message });
    }
};



const exportOrderToPDF = async (orderId) => {
    try {
        const order = await Order.findOne({ orderid: orderId })
            .populate('userId')
            .populate('products.productId');
        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        const filePath = path.join(__dirname, '../public/invoices/', `${orderId}_invoice.pdf`);

        // Check if the file already exists
        if (fs.existsSync(filePath)) {
            console.log('File already exists. Skipping creation...');
            return { success: true, message: 'Invoice already exists', filePath };
        }

        // Initialize PDF document
        const doc = new PDFDocument({ margin: 30 });

        // Create a write stream to the file path
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add header
        doc.fontSize(25).text("DIECASTCARZ.SHOP", { align: "center" }).moveDown().moveDown();
        doc.fontSize(20).text("INVOICE", { align: "center" }).moveDown();

        // Add invoice details
        doc.fontSize(10)
            .text(`Invoice No.: #${order.orderid}`)
            .text(`Order Date: ${order.orderDate ? order.orderDate.toLocaleDateString() : 'N/A'}`)
            .text(`Payment Method: ${order.paymentMethod}`)
            .moveDown();

        // Add customer details
        const address = order.address || {};
        doc.fontSize(10)
            .text("Customer Details:")
            .text(`Name: ${address.firstName || ''} ${address.lastName || ''}`)
            .text(`Email: ${address.deliveryemail || 'N/A'}`)
            .text(`Phone: ${address.phone || 'N/A'}`)
            .text(
                `Address: ${(address.street || '')}, ${(address.city || '')}, ${(address.state || '')}, ${(address.country || '')}, ${(address.zipCode || '')}`
            )
            .moveDown();

        // Draw table for products
        doc.text("Products:", { underline: true }).moveDown();

        // Table headers with enough space for columns
        const tableHeaders = ['#', 'Product Name', 'Price', 'Quantity', 'Total'];
        const headerY = doc.y; // Get current y position for header

        // Set column positions with reduced widths for serial number and quantity columns
        const colX = [30, 60, 300, 350, 420];

        // Draw header row with column positions
        doc.fontSize(10).text(tableHeaders[0], colX[0], headerY);
        doc.text(tableHeaders[1], colX[1], headerY);
        doc.text(tableHeaders[2], colX[2], headerY);
        doc.text(tableHeaders[3], colX[3], headerY);
        doc.text(tableHeaders[4], colX[4], headerY);

        // Draw line after header
        doc.lineCap('butt')
            .moveTo(30, headerY + 10)
            .lineTo(500, headerY + 10)
            .stroke();

        let currentY = headerY + 20; // Set the starting y-coordinate for rows
        const rowHeight = 30; // Increased row height for better readability
        const productsPerPage = 20; // Limit to 20 products per page
        const totalProducts = order.products.length;
        const totalPages = Math.ceil(totalProducts / productsPerPage);

        // Loop through products and create rows (with pagination)
        for (let page = 0; page < totalPages; page++) {
            if (page > 0) doc.addPage(); // Add new page after the first one

            // Add products for the current page
            const start = page * productsPerPage;
            const end = Math.min(start + productsPerPage, totalProducts);
            for (let i = start; i < end; i++) {
                const product = order.products[i];

                if (currentY >= 700) {  // Check if the page height is near the end (e.g., 700px)
                    doc.addPage();  // Add a new page if needed
                    currentY = 30;  // Reset the y-coordinate to start at the top of the new page
                }

                // Add row data, with enough space for product name
                doc.text(i + 1, colX[0], currentY);  // Index column
                doc.text(
                    product.productName.length > 70 ? `${product.productName.slice(0, 70)}...` : product.productName,
                    colX[1],
                    currentY,
                    { width: 220, ellipsis: true, lineBreak: true } // Truncate and wrap Product name
                );  // Truncated Product name if too long

                doc.text(product.price, colX[2], currentY);  // Price column       
                doc.text(product.quantity, colX[3], currentY);  // Quantity column                 
                doc.text(product.quantity * product.price, colX[4], currentY);  // Total price column

                // Draw line after each row
                doc.lineCap('butt')
                    .moveTo(30, currentY + rowHeight - 5)  // Adjust line position to match row height
                    .lineTo(500, currentY + rowHeight - 5)
                    .stroke();

                currentY += rowHeight;  // Increase y-coordinate for the next row
            }
        }

        // Add total summary
        doc.moveDown().moveDown().moveDown().moveDown().moveDown()
            .font("Helvetica-Bold").fontSize(12)
            .text(`Total: $${order.totalSum}`)
            .text(`Discount: ${order.discountPercentage}%`)
            .text(`Shipping Cost: $0`)
            .moveDown()
            .text(`Final Total: $${order.totalPrice}`);

        doc.end();

        // Wait for the PDF generation to complete
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        return { success: true, message: 'Invoice generated successfully', filePath };
    } catch (error) {
        console.error('Error generating PDF:', error);
        return { success: false, message: 'Error generating PDF' };
    }
};









module.exports = {
    user_order_placed,
    user_order_details,
    user_cancel_order_page,
    user_cancel_order,
    user_return_order_page,
    user_return_order,

    user_invoice_download,

    admin_orders_list,
    admin_change_order_status,
    admin_individual_order_page,
    admin_individual_order_cancel_page,
    admin_individual_order_cancel


}