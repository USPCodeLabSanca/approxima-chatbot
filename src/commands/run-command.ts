import { cleanString } from '../helpers/string';
import { Command, StateResolverFunction } from '../models/commands';
import { ApproximaClient } from '../services/client';
import { commandExecuter } from './command-execute';

export const runCommand = async (
  client: ApproximaClient, command: Command, arg?: string
) => {

  const state = client.getCurrentState();

  if ((!state.currentUser || !state.currentUser.active) && command !== 'start') {
    client.sendMessage('Você precisa se registrar para continuar! Use o /start');
    return;
  }

  let stateResolver: StateResolverFunction<Command>;

  if (state.currentState === 'INITIAL' && typeof commandExecuter[command] === 'function') {
    // @ts-ignore
    stateResolver = await commandExecuter[command];
  }
  else {
    // @ts-ignore
    stateResolver = await commandExecuter[command][state.currentState];
  }

  const nextState = await stateResolver(client, cleanString(arg), arg || '');

  if (nextState === 'END') {
    client.resetCurrentState();
    clearTimeout(state.callbackTimeoutId);
    state.callbackTimeoutId = undefined;
  }
  else {
    state.currentState = nextState;
    state.currentCommand = command;
  }
};
