module.exports = {
    name: 'bal',
    description: 'Get your current balance',
    args: false,
    type: 'currency',

    execute(message, args, currency) {
        const target = message.mentions.users.first() || message.author;
        return message.channel.send(`${target.username} has ${currency.getBalance(target.tag)} Eeg Bucks`);
    }
}