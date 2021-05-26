const Discord = require('discord.js');

module.exports = {
    name: 'shop',
    args: false,
    description : 'Displays everything in the shop',
    type: 'currency',

    async execute(message, args, CurrencyShop) {

        let shopEmbed = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle('Eeg\'s Bazaar');

        const shopItems = await CurrencyShop.findAll();

        shopItems.forEach(item => {shopEmbed.addField(`**${item.name}** (${item.id})`, `Buy Price: \`E$ ${item.cost}\` \nSell Price: \`E$ ${item.sellPrice}\` `, true); shopEmbed.addField('\u200B', '\u200b',true)})


        message.channel.send(shopEmbed);
        return message.channel.send('Use !buy <id> <amount> or !sell <id> <amount>');
        
    }
}