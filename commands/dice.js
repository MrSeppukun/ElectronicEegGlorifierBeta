module.exports = {
    name: 'dice',
    description: 'Roll a dice. If it lands on what you guessed, triple your bet.',
    args: true,
    usage: "<wager> <guess>",
    type: 'currency',

    execute(message, args, currency) {

        let wager = args[0];

        if (wager > currency.getBalance(message.author.tag)) {
            return message.reply('You\'re betting more than you have!');
        }

        let guess = args[1];

        if (guess > 6) {
            return message.reply('You can\'t bet on a number greater than ');
        }

        let roll = (Math.floor(Math.random() * Math.floor(6))) + 1;

        message.channel.send(`Rolled a ${roll}`);

        if (parseInt(guess) === roll) {
            return 1;
        }

        else {
            return 2;
        }
    }
}