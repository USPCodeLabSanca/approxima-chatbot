import { randomInt } from '../../helpers';
import { CommandStateResolver } from '../../models/commands';
import { answerState } from './common/answer-state';
import { IUser } from '../../models/user';

interface IRandomContext {
  user: IUser;
  lastShownId?: number;
}

export const randomCommand: CommandStateResolver<'random'> = {
  INITIAL: async (client, _arg) => {
    /**
    random => Mostra uma pessoa: any aleatória. Embaixo, um botão para enviar a solicitação
    de conexão deve existir, bem como um botão de "agora não".
    **/

    const context = client.getCurrentContext<IRandomContext>();
    // facilita na hora de referenciar esse usuario
    const userId = client.userId;

    context.user = await client.db.user.get(userId);

    // get all users (IDs) from the DB
    const allUsers = await client.db.user.getAll();

    const myAllowedUsers = allUsers.filter(user => {
      const otherUserId = user._id;
      return otherUserId !== userId &&
        !context.user.pending.includes(otherUserId) &&
        !context.user.invited.includes(otherUserId) &&
        !context.user.connections.includes(otherUserId) &&
        !context.user.rejects.includes(otherUserId);
    });

    // Preciso, ainda, tirar aqueles que me tem em sua lista de rejects
    const finalAllowedUsers = [];
    for (const user of myAllowedUsers) {
      if (!user.rejects.includes(userId)) {
        finalAllowedUsers.push(user);
      }
    }

    if (finalAllowedUsers.length === 0) {
      client.sendMessage(
        'Não tenho ninguém novo para te mostrar no momento... que tal tentar amanhã? :)'
      );
      return 'END';
    }

    const target = finalAllowedUsers[randomInt(0, finalAllowedUsers.length)];
    const targetBio = (await client.db.user.get(target._id)).bio;

    // Avisa no contexto que essa pessoa foi a ultima a ser exibida para o usuario (ajuda nas callback queries)
    context.lastShownId = target._id;

    // MENSAGEM DO BOT

    const keyboard = [[
      { text: 'Conectar', callback_data: 'connect' },
      { text: 'Agora não', callback_data: 'dismiss' }
    ]];

    const text = `"${targetBio}"`;

    client.sendMessage(
      text, { reply_markup: { inline_keyboard: keyboard } });

    return 'ANSWER';
  },
  ANSWER: answerState
};