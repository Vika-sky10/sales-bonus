/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет прибыли от операции
    const quantity = purchase.quantity || 1;
    const price = purchase.sale_price; // Основная цена
    if (!purchase.discount) {
        return price * quantity; // Выручка без скидки
    }
    const discountMultiplier = 1 - (purchase.discount / 100);
    return price * quantity * discountMultiplier; // Выручка со скидкой
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    if (index === 0) { 
        return seller.profit * 0.15;
    } else if (index === 1 || index === 2) { 
        return seller.profit * 0.10; 
    } else if (index === total - 1) { 
        return seller.profit *  0; 
    } else { 
        return seller.profit * 0.05; 
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records)) {
        throw new Error('Некорректные входные данные');
    }
    if (data.sellers.length === 0 || data.products.length === 0 || data.purchase_records.length === 0) {
        throw new Error('Массивы данных не должны быть пустыми');
    }
    // @TODO: Проверка наличия опций
    if (!options || typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function')  {
        throw new Error('Опции должны содержать функции calculateRevenue и calculateBonus');
    }
    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => {
        if (!seller.id || !seller.first_name || !seller.last_name) {
            console.error('Некорректные данные продавца:', seller);
            throw new Error('Данные продавца должны содержать id, first_name и last_name');
        }
        return {
            seller_id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {},
            bonus: 0
        }
    });
    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(data.sellers.map(seller => [seller.id, seller]));
    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });
    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) {
        console.warn(`Продавец ${record.seller_id} не найден`);
        return;
    }
    
    const sellerStat = sellerStats.find(s => s.seller_id === record.seller_id);
    if (!sellerStat) return;

    sellerStat.revenue += Number(record.total_amount) || 0;
    sellerStat.sales_count += 1;

    let totalCost = 0;
    let totalRevenue = Number(record.total_amount) || 0;
    const totalItemsPrice = record.items.reduce((sum, item) => {
        const product = productIndex[item.sku];
        if (!product) return sum;
        return sum + (product.price * (Number(item.quantity) || 1));
    }, 0);

    record.items.forEach(item => {
        const product = productIndex[item.sku];
        if (!item.sku || typeof item.quantity === 'undefined') {
            console.warn(`Товар с SKU ${item.sku} не найден, пропускаем`);
            return;
        }

        const quantity = Number(item.quantity) || 1;
        const cost = Number(product.purchase_price) * quantity;
        totalCost += cost;
        
        const itemPrice = product.price * quantity;
        const revenue = options.calculateRevenue(item)
        const profit = revenue - cost;
        sellerStat.profit += profit;
    });
    })
    // @TODO: Сортировка продавцов по прибыли
    const sortedSellers = [...sellerStats].sort((a, b) => b.profit - a.profit);
    const totalSellers = sortedSellers.length;

    sortedSellers.forEach((seller, index) => {
        const bonusPercentage = options.calculateBonus(index, totalSellers, seller); 

        seller.bonus = Math.floor( bonusPercentage * 100) / 100;
        seller.top_products = Object.entries(seller.products_sold || {})
            .map(([sku, quantity]) => ({
                sku,
                name: productIndex[sku]?.name || 'Неизвестный товар',
                quantity: Number(quantity) || 0
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sortedSellers.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products || [],
        bonus: seller.bonus
    }));
}