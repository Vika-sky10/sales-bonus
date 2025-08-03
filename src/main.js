/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
   const { discount, sale_price, quantity } = purchase;
    const discountDecimal = discount / 100;
    const totalPrice = sale_price * quantity;
    return totalPrice * (1 - discountDecimal);
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
    const { profit } = seller;
    if (index === 0) return 15; // Первое место
    if (index === 1 || index === 2) return 10; // Второе и третье место
    if (index === total - 1) return 0; // Последнее место
    return 5; 
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // 2. Проверка опций
    if (typeof options !== 'object' || options === null) {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Не переданы обязательные функции для расчетов');
    }

    // 3. Подготовка промежуточных данных
    const sellersStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // 4. Создание индексов
    const sellerIndex = Object.fromEntries(sellersStats.map(s => [s.id, s]));
    const productIndex = Object.fromEntries(data.products.map(p => [p.article, p]));

    // 5. Основной цикл обработки покупок
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        // Обновляем общие показатели продавца
        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        // Обработка товаров в чеке
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            // Расчет показателей для товара
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;

            // Обновляем статистику продавца
            seller.profit += profit;

            // Учет проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // 6. Сортировка продавцов по прибыли (убывание)
    const sortedSellers = [...sellersStats].sort((a, b) => b.profit - a.profit);

    // 7. Назначение бонусов и формирование топ-товаров
    const totalSellers = sortedSellers.length;
    sortedSellers.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);
        
        // Формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity,
                name: productIndex[sku]?.name || 'Unknown'
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // 8. Формирование итогового отчета
    return sortedSellers.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        bonus: +seller.bonus.toFixed(2),
        top_products: seller.top_products
    }));
}