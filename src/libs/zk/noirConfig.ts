/* eslint-disable @typescript-eslint/no-explicit-any */
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import { ethers } from 'ethers';

// Noir circuit paths - update these to match your actual file locations
export const CIRCUIT_PATHS = {
    BOARD_PLACEMENT: '../../circuits/board_placement.json',
    SHOT_RESULT: '../../circuits/shot_result.json',
    GAME_END: '../../circuits/game_end.json'
};

// Cache for compiled circuits
const circuitCache: Record<string, any> = {};

/**
 * Load a compiled Noir circuit
 * @param circuitPath Path to the compiled circuit JSON
 * @returns The loaded circuit data
 */
export async function loadCircuit(circuitPath: string): Promise<any> {
    // Check cache first
    if (circuitCache[circuitPath]) {
        return circuitCache[circuitPath];
    }
    
    // Fetch the circuit
    const response = await fetch(circuitPath);
    
    if (!response.ok) {
        throw new Error(`Failed to load circuit from ${circuitPath}: ${response.statusText}`);
    }
    
    const circuitData = await response.json();
    
    // Cache the circuit
    circuitCache[circuitPath] = circuitData;
    
    return circuitData;
}

/**
 * Generate a ZK proof to submit to the game contract
 * @param circuitPath Path to the compiled circuit
 * @param input Input to the circuit
 * @returns Hex-encoded proof to submit to the smart contract
 */
export async function generateProof(circuitPath: string, input: any): Promise<string> {
    console.log(`Generating proof using circuit: ${circuitPath}`);
    
    // Initialize Noir and backend
    const circuitData = await loadCircuit(circuitPath);
    const noir = new Noir(circuitData);
    const backend = new UltraHonkBackend(circuitData.bytecode);
    
    // Execute circuit to generate witness
    console.log("Executing circuit with input:", JSON.stringify(input, (key, value) => 
        key === 'salt' ? '***HIDDEN***' : value
    ));
    const { witness } = await noir.execute(input);
    
    // Generate proof
    console.log("Generating proof with Barretenberg...");
    const proof = await backend.generateProof(witness);
    console.log("Proof generated successfully - ready for contract submission!");
    
    // Convert proof to hex string for contract submission
    return ethers.utils.hexlify(proof.proof);
}