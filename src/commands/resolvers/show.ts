import { CommandStateResolver } from '../../models/commands';
import { rank } from '../../services/ranker';
import { answerState, confirmState, presentUser } from './common/show-random';

interface IShowContext {
	lastShownId: number | undefined;
	messageId: number;
	bio: string;
}

export const showCommand: CommandStateResolver<'show'> = {
	INITIAL: async (client, _arg) => {
		/**
		show => Mostra uma pessoa que tem interesses em comum (vai com base no ranking).
		Embaixo, um botão para enviar a solicitação de conexão deve existir,
		bem como um botão de "agora não".
		**/

		const { currentUser, context } = client.getCurrentState<IShowContext>();

		// get all active users (IDs) from the DB
		let allUsers;

		try {
			allUsers = await client.db.user.getAll();
		}
		catch (err) {
			console.error(err);
			client.sendMessage(
				'Oops. Parece que houve um erro em nosso servidor. Tente novamente mais tarde. :)'
			);
			client.registerAction('random_person_command', { error: err });
			return 'END';
		}

		// Usuarios que podem aparecer para mim, de acordo com os dados do meu perfil
		const allowedUsers = allUsers.filter(otherUser => {
			return otherUser._id !== currentUser._id &&
				!currentUser.invited.includes(otherUser._id) &&
				!currentUser.rejects.includes(otherUser._id) &&
				!currentUser.pending.includes(otherUser._id) &&
				!currentUser.connections.includes(otherUser._id);
		});

		if (allowedUsers.length === 0) {
			client.sendMessage(
				'Não tenho ninguém novo para te mostrar no momento... que tal tentar amanhã? :)'
			);

			client.registerAction('show_person_command', { no_one_to_show: true });

			return 'END';
		}

		// Mapeia os usuarios aos seus interesses
		const usersInterests: { [userId: number]: string[] } = {};
		for (const user of allowedUsers) {
			if (!user['rejects'].includes(client.userId)) {
				usersInterests[user._id] = user.interests;
			}
		}
		const target = rank(currentUser.interests, usersInterests);

		if (!target) {
			// Nao ha ninguem com as preferencias do usuario ainda
			/* eslint-disable max-len */
			const response = 'Parece que não há ninguém com os mesmos gostos que você no sistema ainda...\n\n' +
				'Você pode tentar:\n' +
				'- Marcar mais categorias de interesse\n' +
				'- O comando /random (pessoa aleatória)';
			/* eslint-enable max-len */

			client.sendMessage(response);

			client.registerAction('show_person_command', {
				no_one_to_show: true,
				no_one_with_same_prefs: true,
			});

			return 'END';
		}

		// Daqui para frente, sabemos que uma pessoa similar existe
		const targetBio = (await client.db.user.get(target)).bio;

		// Avisa no contexto que essa pessoa foi a ultima a ser exibida para o usuario (ajuda nas callback queries)
		context.lastShownId = target;
		context.bio = targetBio;

		client.registerAction('show_person_command', { success: true, target });

		return await presentUser(client);
	},
	ANSWER: answerState,
	CONFIRM: confirmState,
};
