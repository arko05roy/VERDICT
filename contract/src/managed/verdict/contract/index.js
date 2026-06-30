import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.14.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_2 = new __compactRuntime.CompactTypeEnum(1, 1);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

const _descriptor_5 = new __compactRuntime.CompactTypeVector(16, _descriptor_3);

const _descriptor_6 = new __compactRuntime.CompactTypeVector(8, _descriptor_3);

const _descriptor_7 = new __compactRuntime.CompactTypeVector(2, _descriptor_3);

const _descriptor_8 = new __compactRuntime.CompactTypeVector(5, _descriptor_3);

const _descriptor_9 = new __compactRuntime.CompactTypeVector(6, _descriptor_3);

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_1.fromValue(value_0),
      right: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_1.toValue(value_0.left).concat(_descriptor_1.toValue(value_0.right)));
  }
}

const _descriptor_10 = new _Either_0();

const _descriptor_11 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_12 = new _ContractAddress_0();

const _descriptor_13 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.getPrevPrevPos) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getPrevPrevPos');
    }
    if (typeof(witnesses_0.getPrevPos) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getPrevPos');
    }
    if (typeof(witnesses_0.getCurrPos) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getCurrPos');
    }
    if (typeof(witnesses_0.getAction) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getAction');
    }
    if (typeof(witnesses_0.getIsFirstMove) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getIsFirstMove');
    }
    if (typeof(witnesses_0.getPrevHash) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getPrevHash');
    }
    if (typeof(witnesses_0.getNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getNonce');
    }
    if (typeof(witnesses_0.getAimHistory) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getAimHistory');
    }
    if (typeof(witnesses_0.getActionHistory) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getActionHistory');
    }
    if (typeof(witnesses_0.getTickHistory) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getTickHistory');
    }
    if (typeof(witnesses_0.getCurrentTick) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getCurrentTick');
    }
    if (typeof(witnesses_0.getEnemyPositions) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getEnemyPositions');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      startSession: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`startSession: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const genesisHash_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('startSession',
                                     'argument 1 (as invoked from Typescript)',
                                     'verdict.compact line 50 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(genesisHash_0.buffer instanceof ArrayBuffer && genesisHash_0.BYTES_PER_ELEMENT === 1 && genesisHash_0.length === 32)) {
          __compactRuntime.typeError('startSession',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'verdict.compact line 50 char 1',
                                     'Bytes<32>',
                                     genesisHash_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(genesisHash_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._startSession_0(context,
                                              partialProofData,
                                              genesisHash_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      commitMove: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`commitMove: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const c_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('commitMove',
                                     'argument 1 (as invoked from Typescript)',
                                     'verdict.compact line 56 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(c_0.buffer instanceof ArrayBuffer && c_0.BYTES_PER_ELEMENT === 1 && c_0.length === 32)) {
          __compactRuntime.typeError('commitMove',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'verdict.compact line 56 char 1',
                                     'Bytes<32>',
                                     c_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(c_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._commitMove_0(context, partialProofData, c_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      verifyTransition: (...args_1) => {
        if (args_1.length !== 13) {
          throw new __compactRuntime.CompactError(`verifyTransition: expected 13 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const maxVelocity_0 = args_1[1];
        const maxAcceleration_0 = args_1[2];
        const boundX_0 = args_1[3];
        const boundY_0 = args_1[4];
        const validActionCount_0 = args_1[5];
        const maxActionsPerWindow_0 = args_1[6];
        const windowSize_0 = args_1[7];
        const minDiversity_0 = args_1[8];
        const snapThreshold_0 = args_1[9];
        const maxSnaps_0 = args_1[10];
        const maxCorrelation_0 = args_1[11];
        const enemyPosHashPublic_0 = args_1[12];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 1 (as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(maxVelocity_0) === 'bigint' && maxVelocity_0 >= 0n && maxVelocity_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     maxVelocity_0)
        }
        if (!(typeof(maxAcceleration_0) === 'bigint' && maxAcceleration_0 >= 0n && maxAcceleration_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     maxAcceleration_0)
        }
        if (!(typeof(boundX_0) === 'bigint' && boundX_0 >= 0n && boundX_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     boundX_0)
        }
        if (!(typeof(boundY_0) === 'bigint' && boundY_0 >= 0n && boundY_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     boundY_0)
        }
        if (!(typeof(validActionCount_0) === 'bigint' && validActionCount_0 >= 0n && validActionCount_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     validActionCount_0)
        }
        if (!(typeof(maxActionsPerWindow_0) === 'bigint' && maxActionsPerWindow_0 >= 0n && maxActionsPerWindow_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     maxActionsPerWindow_0)
        }
        if (!(typeof(windowSize_0) === 'bigint' && windowSize_0 >= 0n && windowSize_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     windowSize_0)
        }
        if (!(typeof(minDiversity_0) === 'bigint' && minDiversity_0 >= 0n && minDiversity_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     minDiversity_0)
        }
        if (!(typeof(snapThreshold_0) === 'bigint' && snapThreshold_0 >= 0n && snapThreshold_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     snapThreshold_0)
        }
        if (!(typeof(maxSnaps_0) === 'bigint' && maxSnaps_0 >= 0n && maxSnaps_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 10 (argument 11 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     maxSnaps_0)
        }
        if (!(typeof(maxCorrelation_0) === 'bigint' && maxCorrelation_0 >= 0n && maxCorrelation_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 11 (argument 12 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Uint<0..18446744073709551616>',
                                     maxCorrelation_0)
        }
        if (!(enemyPosHashPublic_0.buffer instanceof ArrayBuffer && enemyPosHashPublic_0.BYTES_PER_ELEMENT === 1 && enemyPosHashPublic_0.length === 32)) {
          __compactRuntime.typeError('verifyTransition',
                                     'argument 12 (argument 13 as invoked from Typescript)',
                                     'verdict.compact line 64 char 1',
                                     'Bytes<32>',
                                     enemyPosHashPublic_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(maxVelocity_0).concat(_descriptor_3.toValue(maxAcceleration_0).concat(_descriptor_3.toValue(boundX_0).concat(_descriptor_3.toValue(boundY_0).concat(_descriptor_3.toValue(validActionCount_0).concat(_descriptor_3.toValue(maxActionsPerWindow_0).concat(_descriptor_3.toValue(windowSize_0).concat(_descriptor_3.toValue(minDiversity_0).concat(_descriptor_3.toValue(snapThreshold_0).concat(_descriptor_3.toValue(maxSnaps_0).concat(_descriptor_3.toValue(maxCorrelation_0).concat(_descriptor_1.toValue(enemyPosHashPublic_0)))))))))))),
            alignment: _descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_3.alignment().concat(_descriptor_1.alignment())))))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._verifyTransition_0(context,
                                                  partialProofData,
                                                  maxVelocity_0,
                                                  maxAcceleration_0,
                                                  boundX_0,
                                                  boundY_0,
                                                  validActionCount_0,
                                                  maxActionsPerWindow_0,
                                                  windowSize_0,
                                                  minDiversity_0,
                                                  snapThreshold_0,
                                                  maxSnaps_0,
                                                  maxCorrelation_0,
                                                  enemyPosHashPublic_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      startSession: this.circuits.startSession,
      commitMove: this.circuits.commitMove,
      verifyTransition: this.circuits.verifyTransition
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('startSession', new __compactRuntime.ContractOperation());
    state_0.setOperation('commitMove', new __compactRuntime.ContractOperation());
    state_0.setOperation('verifyTransition', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(0n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(1n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(2n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(3n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(4n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(5n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(false),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_5, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_8,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _getPrevPrevPos_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getPrevPrevPos(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getPrevPrevPos',
                                 'return value',
                                 'verdict.compact line 18 char 1',
                                 'Vector<2, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_7.toValue(result_0),
      alignment: _descriptor_7.alignment()
    });
    return result_0;
  }
  _getPrevPos_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getPrevPos(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getPrevPos',
                                 'return value',
                                 'verdict.compact line 19 char 1',
                                 'Vector<2, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_7.toValue(result_0),
      alignment: _descriptor_7.alignment()
    });
    return result_0;
  }
  _getCurrPos_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getCurrPos(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getCurrPos',
                                 'return value',
                                 'verdict.compact line 20 char 1',
                                 'Vector<2, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_7.toValue(result_0),
      alignment: _descriptor_7.alignment()
    });
    return result_0;
  }
  _getAction_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getAction(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('getAction',
                                 'return value',
                                 'verdict.compact line 21 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_3.toValue(result_0),
      alignment: _descriptor_3.alignment()
    });
    return result_0;
  }
  _getIsFirstMove_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getIsFirstMove(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('getIsFirstMove',
                                 'return value',
                                 'verdict.compact line 22 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_3.toValue(result_0),
      alignment: _descriptor_3.alignment()
    });
    return result_0;
  }
  _getPrevHash_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getPrevHash(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('getPrevHash',
                                 'return value',
                                 'verdict.compact line 25 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _getNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('getNonce',
                                 'return value',
                                 'verdict.compact line 28 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _getAimHistory_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getAimHistory(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 16 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getAimHistory',
                                 'return value',
                                 'verdict.compact line 31 char 1',
                                 'Vector<16, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _getActionHistory_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getActionHistory(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 8 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getActionHistory',
                                 'return value',
                                 'verdict.compact line 34 char 1',
                                 'Vector<8, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _getTickHistory_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getTickHistory(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 8 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getTickHistory',
                                 'return value',
                                 'verdict.compact line 37 char 1',
                                 'Vector<8, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _getCurrentTick_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getCurrentTick(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 18446744073709551615n)) {
      __compactRuntime.typeError('getCurrentTick',
                                 'return value',
                                 'verdict.compact line 38 char 1',
                                 'Uint<0..18446744073709551616>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_3.toValue(result_0),
      alignment: _descriptor_3.alignment()
    });
    return result_0;
  }
  _getEnemyPositions_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getEnemyPositions(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 16 && result_0.every((t) => typeof(t) === 'bigint' && t >= 0n && t <= 18446744073709551615n))) {
      __compactRuntime.typeError('getEnemyPositions',
                                 'return value',
                                 'verdict.compact line 41 char 1',
                                 'Vector<16, Uint<0..18446744073709551616>>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _absDiff_0(a_0, b_0) {
    if (a_0 >= b_0) {
      __compactRuntime.assert(a_0 >= b_0,
                              'result of subtraction would be negative');
      return a_0 - b_0;
    } else {
      __compactRuntime.assert(b_0 >= a_0,
                              'result of subtraction would be negative');
      return b_0 - a_0;
    }
  }
  _startSession_0(context, partialProofData, genesisHash_0) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(4n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(genesisHash_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(5n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(true),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _commitMove_0(context, partialProofData, c_0) {
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(3n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(c_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _verifyTransition_0(context,
                      partialProofData,
                      maxVelocity_0,
                      maxAcceleration_0,
                      boundX_0,
                      boundY_0,
                      validActionCount_0,
                      maxActionsPerWindow_0,
                      windowSize_0,
                      minDiversity_0,
                      snapThreshold_0,
                      maxSnaps_0,
                      maxCorrelation_0,
                      enemyPosHashPublic_0)
  {
    const pp_0 = this._getPrevPrevPos_0(context, partialProofData);
    const p_0 = this._getPrevPos_0(context, partialProofData);
    const c_0 = this._getCurrPos_0(context, partialProofData);
    const action_0 = this._getAction_0(context, partialProofData);
    const isFirst_0 = this._getIsFirstMove_0(context, partialProofData);
    const prevHash_0 = this._getPrevHash_0(context, partialProofData);
    const nonce_0 = this._getNonce_0(context, partialProofData);
    const aimFlat_0 = this._getAimHistory_0(context, partialProofData);
    const actHist_0 = this._getActionHistory_0(context, partialProofData);
    const tickHist_0 = this._getTickHistory_0(context, partialProofData);
    const now_0 = this._getCurrentTick_0(context, partialProofData);
    const enemyFlat_0 = this._getEnemyPositions_0(context, partialProofData);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_13.toValue(0n),
                                                                  alignment: _descriptor_13.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_0.toValue(tmp_0),
                                                                alignment: _descriptor_0.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    const recomputedHash_0 = this._persistentHash_0([p_0[0],
                                                     p_0[1],
                                                     c_0[0],
                                                     c_0[1],
                                                     action_0,
                                                     now_0]);
    __compactRuntime.assert(this._equal_0(prevHash_0,
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_13.toValue(4n),
                                                                                                                                alignment: _descriptor_13.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Hash chain broken: prevHash mismatch');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(4n),
                                                                                              alignment: _descriptor_13.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(recomputedHash_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const recomputedCommit_0 = this._persistentCommit_0([p_0[0],
                                                         p_0[1],
                                                         c_0[0],
                                                         c_0[1],
                                                         action_0],
                                                        nonce_0);
    __compactRuntime.assert(this._equal_1(recomputedCommit_0,
                                          _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_13.toValue(3n),
                                                                                                                                alignment: _descriptor_13.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'Commit-reveal mismatch: move was altered');
    const dx_0 = this._absDiff_0(c_0[0], p_0[0]);
    const dy_0 = this._absDiff_0(c_0[1], p_0[1]);
    const velocity_0 = dx_0 + dy_0;
    const check3Fail_0 = velocity_0 > maxVelocity_0 ? 1n : 0n;
    const pdx_0 = this._absDiff_0(p_0[0], pp_0[0]);
    const pdy_0 = this._absDiff_0(p_0[1], pp_0[1]);
    const prevVelocity_0 = pdx_0 + pdy_0;
    const accel_0 = this._absDiff_0(((t1) => {
                                      if (t1 > 18446744073709551615n) {
                                        throw new __compactRuntime.CompactError('verdict.compact line 126 char 25: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                      }
                                      return t1;
                                    })(velocity_0),
                                    ((t1) => {
                                      if (t1 > 18446744073709551615n) {
                                        throw new __compactRuntime.CompactError('verdict.compact line 126 char 47: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                      }
                                      return t1;
                                    })(prevVelocity_0));
    const check4Fail_0 = this._equal_2(isFirst_0, 0n) ?
                         accel_0 > maxAcceleration_0 ? 1n : 0n :
                         0n;
    const check5Fail_0 = (c_0[0] > boundX_0 ? 1n : 0n)
                         +
                         (c_0[1] > boundY_0 ? 1n : 0n);
    const check6Fail_0 = action_0 >= validActionCount_0 ? 1n : 0n;
    __compactRuntime.assert(tickHist_0[0] <= tickHist_0[1],
                            'Tick history not monotonic');
    __compactRuntime.assert(tickHist_0[1] <= tickHist_0[2],
                            'Tick history not monotonic');
    __compactRuntime.assert(tickHist_0[2] <= tickHist_0[3],
                            'Tick history not monotonic');
    __compactRuntime.assert(tickHist_0[3] <= tickHist_0[4],
                            'Tick history not monotonic');
    __compactRuntime.assert(tickHist_0[4] <= tickHist_0[5],
                            'Tick history not monotonic');
    __compactRuntime.assert(tickHist_0[5] <= tickHist_0[6],
                            'Tick history not monotonic');
    __compactRuntime.assert(tickHist_0[6] <= tickHist_0[7],
                            'Tick history not monotonic');
    const windowStart_0 = (__compactRuntime.assert(now_0 >= windowSize_0,
                                                   'result of subtraction would be negative'),
                           now_0 - windowSize_0);
    const actionsInWindow_0 = (tickHist_0[0] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[1] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[2] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[3] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[4] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[5] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[6] >= windowStart_0 ? 1n : 0n)
                              +
                              (tickHist_0[7] >= windowStart_0 ? 1n : 0n);
    const check7Fail_0 = actionsInWindow_0 > maxActionsPerWindow_0 ? 1n : 0n;
    const freq0_0 = this._folder_0(context,
                                   partialProofData,
                                   ((context, partialProofData, acc_0, a_0) =>
                                    {
                                      return ((t1) => {
                                               if (t1 > 18446744073709551615n) {
                                                 throw new __compactRuntime.CompactError('verdict.compact line 171 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                               }
                                               return t1;
                                             })(acc_0
                                                +
                                                (this._equal_3(a_0, 0n) ?
                                                 1n :
                                                 0n));
                                    }),
                                   0n,
                                   actHist_0);
    const freq1_0 = this._folder_1(context,
                                   partialProofData,
                                   ((context, partialProofData, acc_1, a_1) =>
                                    {
                                      return ((t1) => {
                                               if (t1 > 18446744073709551615n) {
                                                 throw new __compactRuntime.CompactError('verdict.compact line 176 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                               }
                                               return t1;
                                             })(acc_1
                                                +
                                                (this._equal_4(a_1, 1n) ?
                                                 1n :
                                                 0n));
                                    }),
                                   0n,
                                   actHist_0);
    const freq2_0 = this._folder_2(context,
                                   partialProofData,
                                   ((context, partialProofData, acc_2, a_2) =>
                                    {
                                      return ((t1) => {
                                               if (t1 > 18446744073709551615n) {
                                                 throw new __compactRuntime.CompactError('verdict.compact line 181 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                               }
                                               return t1;
                                             })(acc_2
                                                +
                                                (this._equal_5(a_2, 2n) ?
                                                 1n :
                                                 0n));
                                    }),
                                   0n,
                                   actHist_0);
    const freq3_0 = this._folder_3(context,
                                   partialProofData,
                                   ((context, partialProofData, acc_3, a_3) =>
                                    {
                                      return ((t1) => {
                                               if (t1 > 18446744073709551615n) {
                                                 throw new __compactRuntime.CompactError('verdict.compact line 186 char 27: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                               }
                                               return t1;
                                             })(acc_3
                                                +
                                                (this._equal_6(a_3, 3n) ?
                                                 1n :
                                                 0n));
                                    }),
                                   0n,
                                   actHist_0);
    const sumSq_0 = freq0_0 * freq0_0 + freq1_0 * freq1_0 + freq2_0 * freq2_0
                    +
                    freq3_0 * freq3_0;
    const diversity_0 = (__compactRuntime.assert(64n >= sumSq_0,
                                                 'result of subtraction would be negative'),
                         64n - sumSq_0);
    const check8Fail_0 = diversity_0 < minDiversity_0 ? 1n : 0n;
    const threshSq_0 = snapThreshold_0 * snapThreshold_0;
    const d0x_0_0 = this._absDiff_0(aimFlat_0[2], aimFlat_0[0]);
    const d0y_0_0 = this._absDiff_0(aimFlat_0[3], aimFlat_0[1]);
    const d1x_0_0 = this._absDiff_0(aimFlat_0[4], aimFlat_0[2]);
    const d1y_0_0 = this._absDiff_0(aimFlat_0[5], aimFlat_0[3]);
    const cross0_0 = this._absDiff_0(((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 209 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0x_0_0 * d1y_0_0),
                                     ((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 209 char 55: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0y_0_0 * d1x_0_0));
    const snap0_0 = cross0_0 * cross0_0 > threshSq_0 ? 1n : 0n;
    const d0x_1_0 = this._absDiff_0(aimFlat_0[4], aimFlat_0[2]);
    const d0y_1_0 = this._absDiff_0(aimFlat_0[5], aimFlat_0[3]);
    const d1x_1_0 = this._absDiff_0(aimFlat_0[6], aimFlat_0[4]);
    const d1y_1_0 = this._absDiff_0(aimFlat_0[7], aimFlat_0[5]);
    const cross1_0 = this._absDiff_0(((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 217 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0x_1_0 * d1y_1_0),
                                     ((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 217 char 55: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0y_1_0 * d1x_1_0));
    const snap1_0 = cross1_0 * cross1_0 > threshSq_0 ? 1n : 0n;
    const d0x_2_0 = this._absDiff_0(aimFlat_0[6], aimFlat_0[4]);
    const d0y_2_0 = this._absDiff_0(aimFlat_0[7], aimFlat_0[5]);
    const d1x_2_0 = this._absDiff_0(aimFlat_0[8], aimFlat_0[6]);
    const d1y_2_0 = this._absDiff_0(aimFlat_0[9], aimFlat_0[7]);
    const cross2_0 = this._absDiff_0(((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 225 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0x_2_0 * d1y_2_0),
                                     ((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 225 char 55: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0y_2_0 * d1x_2_0));
    const snap2_0 = cross2_0 * cross2_0 > threshSq_0 ? 1n : 0n;
    const d0x_3_0 = this._absDiff_0(aimFlat_0[8], aimFlat_0[6]);
    const d0y_3_0 = this._absDiff_0(aimFlat_0[9], aimFlat_0[7]);
    const d1x_3_0 = this._absDiff_0(aimFlat_0[10], aimFlat_0[8]);
    const d1y_3_0 = this._absDiff_0(aimFlat_0[11], aimFlat_0[9]);
    const cross3_0 = this._absDiff_0(((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 233 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0x_3_0 * d1y_3_0),
                                     ((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 233 char 55: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0y_3_0 * d1x_3_0));
    const snap3_0 = cross3_0 * cross3_0 > threshSq_0 ? 1n : 0n;
    const d0x_4_0 = this._absDiff_0(aimFlat_0[10], aimFlat_0[8]);
    const d0y_4_0 = this._absDiff_0(aimFlat_0[11], aimFlat_0[9]);
    const d1x_4_0 = this._absDiff_0(aimFlat_0[12], aimFlat_0[10]);
    const d1y_4_0 = this._absDiff_0(aimFlat_0[13], aimFlat_0[11]);
    const cross4_0 = this._absDiff_0(((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 241 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0x_4_0 * d1y_4_0),
                                     ((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 241 char 55: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0y_4_0 * d1x_4_0));
    const snap4_0 = cross4_0 * cross4_0 > threshSq_0 ? 1n : 0n;
    const d0x_5_0 = this._absDiff_0(aimFlat_0[12], aimFlat_0[10]);
    const d0y_5_0 = this._absDiff_0(aimFlat_0[13], aimFlat_0[11]);
    const d1x_5_0 = this._absDiff_0(aimFlat_0[14], aimFlat_0[12]);
    const d1y_5_0 = this._absDiff_0(aimFlat_0[15], aimFlat_0[13]);
    const cross5_0 = this._absDiff_0(((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 249 char 26: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0x_5_0 * d1y_5_0),
                                     ((t1) => {
                                       if (t1 > 18446744073709551615n) {
                                         throw new __compactRuntime.CompactError('verdict.compact line 249 char 55: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                                       }
                                       return t1;
                                     })(d0y_5_0 * d1x_5_0));
    const snap5_0 = cross5_0 * cross5_0 > threshSq_0 ? 1n : 0n;
    const totalSnaps_0 = snap0_0 + snap1_0 + snap2_0 + snap3_0 + snap4_0
                         +
                         snap5_0;
    const check9Fail_0 = totalSnaps_0 > maxSnaps_0 ? 1n : 0n;
    const recomputedEnemyHash_0 = this._persistentHash_1(enemyFlat_0);
    __compactRuntime.assert(this._equal_7(recomputedEnemyHash_0,
                                          enemyPosHashPublic_0),
                            'Enemy position hash mismatch');
    const movingRight_0 = c_0[0] > p_0[0] ? 1n : 0n;
    const movingUp_0 = c_0[1] > p_0[1] ? 1n : 0n;
    const towardX0_0 = this._equal_8(movingRight_0,
                                     enemyFlat_0[0] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY0_0 = this._equal_9(movingUp_0,
                                     enemyFlat_0[1] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX1_0 = this._equal_10(movingRight_0,
                                      enemyFlat_0[2] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY1_0 = this._equal_11(movingUp_0,
                                      enemyFlat_0[3] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX2_0 = this._equal_12(movingRight_0,
                                      enemyFlat_0[4] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY2_0 = this._equal_13(movingUp_0,
                                      enemyFlat_0[5] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX3_0 = this._equal_14(movingRight_0,
                                      enemyFlat_0[6] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY3_0 = this._equal_15(movingUp_0,
                                      enemyFlat_0[7] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX4_0 = this._equal_16(movingRight_0,
                                      enemyFlat_0[8] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY4_0 = this._equal_17(movingUp_0,
                                      enemyFlat_0[9] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX5_0 = this._equal_18(movingRight_0,
                                      enemyFlat_0[10] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY5_0 = this._equal_19(movingUp_0,
                                      enemyFlat_0[11] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX6_0 = this._equal_20(movingRight_0,
                                      enemyFlat_0[12] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY6_0 = this._equal_21(movingUp_0,
                                      enemyFlat_0[13] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardX7_0 = this._equal_22(movingRight_0,
                                      enemyFlat_0[14] > c_0[0] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const towardY7_0 = this._equal_23(movingUp_0,
                                      enemyFlat_0[15] > c_0[1] ? 1n : 0n)
                       ?
                       1n :
                       0n;
    const totalCorrelation_0 = towardX0_0 + towardY0_0 + towardX1_0 + towardY1_0
                               +
                               towardX2_0
                               +
                               towardY2_0
                               +
                               towardX3_0
                               +
                               towardY3_0
                               +
                               towardX4_0
                               +
                               towardY4_0
                               +
                               towardX5_0
                               +
                               towardY5_0
                               +
                               towardX6_0
                               +
                               towardY6_0
                               +
                               towardX7_0
                               +
                               towardY7_0;
    const check10Fail_0 = totalCorrelation_0 > maxCorrelation_0 ? 1n : 0n;
    const anyFailed_0 = check3Fail_0 + check4Fail_0 + check5Fail_0
                        +
                        check6Fail_0
                        +
                        check7Fail_0
                        +
                        check8Fail_0
                        +
                        check9Fail_0
                        +
                        check10Fail_0;
    const isFlagged_0 = anyFailed_0 > 0n;
    if (isFlagged_0) {
      const tmp_1 = 1n;
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_13.toValue(1n),
                                                                    alignment: _descriptor_13.alignment() } }] } },
                                         { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                                { value: _descriptor_0.toValue(tmp_1),
                                                                  alignment: _descriptor_0.alignment() }
                                                                  .value
                                                              )) } },
                                         { ins: { cached: true, n: 1 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(2n),
                                                                                                alignment: _descriptor_13.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(1),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
      return 1;
    } else {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_13.toValue(2n),
                                                                                                alignment: _descriptor_13.alignment() }).encode() } },
                                         { push: { storage: true,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0),
                                                                                                alignment: _descriptor_2.alignment() }).encode() } },
                                         { ins: { cached: false, n: 1 } }]);
      return 0;
    }
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_0(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_1(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_5(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_2(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_6(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _folder_3(context, partialProofData, f, x, a0) {
    for (let i = 0; i < 8; i++) { x = f(context, partialProofData, x, a0[i]); }
    return x;
  }
  _equal_7(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_17(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_18(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_19(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_20(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_21(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_22(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_23(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get totalChecks() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(0n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get totalFlagged() {
      return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(1n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: true,
                                                                                   result: undefined } }]).value);
    },
    get lastVerdict() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(2n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get commitment() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(3n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get lastChainHash() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(4n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get sessionActive() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_13.toValue(5n),
                                                                                                   alignment: _descriptor_13.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  getPrevPrevPos: (...args) => undefined,
  getPrevPos: (...args) => undefined,
  getCurrPos: (...args) => undefined,
  getAction: (...args) => undefined,
  getIsFirstMove: (...args) => undefined,
  getPrevHash: (...args) => undefined,
  getNonce: (...args) => undefined,
  getAimHistory: (...args) => undefined,
  getActionHistory: (...args) => undefined,
  getTickHistory: (...args) => undefined,
  getCurrentTick: (...args) => undefined,
  getEnemyPositions: (...args) => undefined
});
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
