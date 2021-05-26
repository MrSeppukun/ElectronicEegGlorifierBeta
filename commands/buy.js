module.exports = {
    name: 'buy',
    args: true,
    description : 'Buy an item',
    usage: '<itemName> <amount>',
    type: 'currency',

    execute(message, args, currency, CurrencyShop) {
        //const item = await CurrencyShop.findOne({where: {name: {[Op.like]: args[0]}}})
    }
}