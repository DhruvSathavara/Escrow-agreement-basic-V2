import React, { useEffect, useRef, useState } from 'react';
import { ethers, Contract, providers, Signer } from 'ethers';
import './App.css';
import { ESCROW_CONTRACT_ADDRESS, ESCROW_ABI } from './constants';
import Web3Modal from "web3modal";



function App() {
    // Initialize state variables
    const [agreementId, setAgreementId] = useState();
    // console.log(agreementId);

    const [serviceProviderAddress, setServiceProviderAddress] = useState();
    // console.log(serviceProviderAddress);

    const [clientAddress, setClientAddress] = useState();
    const [loading, setLoading] = useState(false);

    const [everyAgreementAsClient, setEveryAgreementAsClient] = useState([]);
    const [everyAgreementAsServiceprovider, setEveryAgreementAsServiceprovider] = useState([]);

    const [funds, setFunds] = useState(0);

    const [selectedTab, setSelectedTab] = useState("client");

    const [totalNumOfAgreement, setTotalNumOfAgreements] = useState(0);

    const [fundsReleased, setFundsReleased] = useState(false);

    const web3ModalRef = useRef();

    const [walletConnected, setWalletConnected] = useState(false);


    const connectWallet = async () => {
        try {
            await getProviderOrSigner();
            setWalletConnected(true);
        } catch (error) {
            console.log(error);

        }
    }

    const getNumOfAgreements = async () => {
        try {
            const provider = await getProviderOrSigner();
            const contract = getEscrowContractInstance(provider);
            const numOfAgreements = await contract.numOfAgreement();
            setTotalNumOfAgreements(numOfAgreements);

        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (totalNumOfAgreement > 0) {
            fetchAllAgreements();
        }
    }, [totalNumOfAgreement])

    // useEffect(() => {
    //     if(selectedTab === "client")
    //     fetchAllAgreements();
    // },[selectedTab])

    useEffect(() => {
        if (!walletConnected) {
            web3ModalRef.current = new Web3Modal({
                network: "goerli",
                providerOptions: {},
                disableInjectedProvider: false,
            });
            connectWallet().then(async () => {
                await getNumOfAgreements();
            })
        }
    }, []);



    // Create an escrow agreement and deposite fund
    const createAgreement = async () => {
        // Validate inputs
        if (agreementId == null || clientAddress == null || serviceProviderAddress == null || funds == null) {
            alert('Please enter all required fields.');
            return;
        }

        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);
        // Send the transaction to create the escrow agreement
        const tx = await escroContract.createEscrowAgreement(agreementId, clientAddress, serviceProviderAddress, { value: ethers.utils.parseEther(funds) });
        setLoading(true)
        await tx.wait();
        setAgreementId("");
        setFunds(0)
        // Update the state to reflect the new escrow agreement
        setFundsReleased(false);

        getNumOfAgreements();
        setLoading(false);
        alert('Escrow agreement created successfully.');
        alert('Funds deposited successfully.');
    }



    function ParsedAgreement(agreeId, clientAdd, providerAdd, completed, fund, released) {
        this.agreeId = agreeId;
        this.clientAdd = clientAdd;
        this.providerAdd = providerAdd;
        this.completed = completed;
        this.fund = fund;
        this.release = released
    }


    const fetchAgreementById = async (id) => {
        console.log('erntered fetch by id', id);

        try {
            const provider = await getProviderOrSigner();
            const escroContract = getEscrowContractInstance(provider);
            let agreement = await escroContract.agreements(id);

            const agrmnt = new ParsedAgreement(id, agreement.client, agreement.serviceProvider, agreement.completed, agreement.funds.toNumber(), agreement.fundsReleased)

            console.log(agrmnt, 'agreement by ID');
            return agrmnt;

        } catch (error) {
            console.log(error);
        };
    }




    const fetchAllAgreements = async () => {
        // console.log('erntered fetch all');
        try {
            const allClientAgreements = [];
            const allProviderAgreements = [];
            console.log(totalNumOfAgreement);
            for (let i = 0; i < totalNumOfAgreement; i++) {
                const agreement = await fetchAgreementById(i);
                if (agreement.clientAdd === clientAddress) {
                    allClientAgreements.push(agreement);

                } else if (agreement.providerAdd === clientAddress) {
                    allProviderAgreements.push(agreement)
                } else { }

                console.log(agreement.clientAdd, 'agreement');
                // allClientAgreements.push(agreement);
            }
            console.log(allClientAgreements, 'allClientAgreements')
            console.log(allProviderAgreements, 'allProviderAgreements')
            setEveryAgreementAsClient(allClientAgreements);
            setEveryAgreementAsServiceprovider(allProviderAgreements);
        } catch (error) {
            console.log(error);
        }
    }

    // Release the funds to the service provider
    const release = async (id) => {
        // Validate inputs
        console.log(id, 'id');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to release the funds
        const tx = await escroContract.releaseFunds(id);
        await tx.wait();

        // Update the state to reflect the funds being released
        setFundsReleased(true);
        alert('Funds released successfully.');
    }

    const cancel = async (id) => {
        // Validate inputs
        console.log(id, 'id');
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        // Send the transaction to release the funds
        const tx = await escroContract.cancel(id);
        await tx.wait();

        // Update the state to reflect the funds being released
        // setFundsReleased(true);
        alert('Agreement canceled.');
    }


    const getProviderOrSigner = async (needSigner = false) => {
        const provider = await web3ModalRef.current.connect();

        const web3Provider = new providers.Web3Provider(provider);
        // console.log((await userAddress).toLowerCase())
        const signerForUserAddress = await web3Provider.getSigner();
        const clientAddress = await signerForUserAddress.getAddress();
        setClientAddress(clientAddress);
        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 5) {
            window.alert("Please switch to the Goerli network!");
            throw new Error("Please switch to the Goerli network");
        }

        if (needSigner) {
            const signer = web3Provider.getSigner();
            return signer;
        }
        return web3Provider;
    }

    const workCompleted = async (id) => {
        const signer = await getProviderOrSigner(true);
        const escroContract = getEscrowContractInstance(signer);

        const tx = await escroContract.completedWork(id);
        await tx.wait();

        alert("Marked your work as completed");
    }

    const getEscrowContractInstance = (providerOrSigner) => {
        return new Contract(
            ESCROW_CONTRACT_ADDRESS,
            ESCROW_ABI,
            providerOrSigner
        );
    };

    function renderTabs() {
        if (selectedTab === "client") {
            return renderClientTab();
        } else if (selectedTab === "service provider") {
            return renderServiceproviderTab();
        }
        return null;
    }

    function renderClientTab() {
        return (
            <div>
                <h1 style={{textAlign:"center"}}>agreements where you were client</h1>
                {everyAgreementAsClient && everyAgreementAsClient.map((agrmnt) => {
                    return (
                        <>
                            <div style={{ marginLeft: "30%", marginBottom: '55px' }} className='offset-2 col-5'>

                                <p>Agreement Id : {agrmnt.agreeId}</p>
                                <p>Client : {agrmnt.clientAdd}</p>
                                <p>Service Provider : {agrmnt.providerAdd}</p>
                                <p>Fund : {agrmnt.fund / 1000000000000000000} Ether</p>
                                {agrmnt.completed ? <div><label>Work Completed : <span style={{ fontSize: "24px", color: "indigo" }}>✓</span> </label></div> :
                                    <div><label>Work Completed : <span style={{ fontSize: "24px", color: "indigo" }}>X</span></label></div>}

                                <p>Fund status : {agrmnt.release ? <span style={{ fontSize: '22px', color: "blueviolet" }}>Released</span> : <span style={{ fontSize: '22px', color: "red" }}>Not Released</span>}</p>

                                {!agrmnt.release ? <div><button style={{ color: "black", backgroundColor: "blue", padding: "5px", margin: "0px 5px 0px 5px" }}
                                    onClick={() => release(agrmnt.agreeId)}
                                >Release Funds</button>


                                    <button style={{ color: "black", backgroundColor: "red", padding: "5px", margin: "0px 5px 0px 5px" }}
                                        onClick={() => cancel(agrmnt.agreeId)}
                                    >Cancel</button></div> : ""}

                            </div>
                        </>
                    )
                })}
            </div>
        )
    }

    function renderServiceproviderTab() {
        return (
            <div>
                <h1 style={{textAlign:"center"}}>agreements where you were provide Service</h1>
                {everyAgreementAsServiceprovider && everyAgreementAsServiceprovider.map((agrmnt) => {
                    console.log(agrmnt.completed);
                    return (
                        <>
                            <div style={{ marginLeft: "30%", marginBottom: '55px' }} className='offset-2 col-5'>

                                <p>Agreement Id : {agrmnt.agreeId}</p>
                                <p>Client : {agrmnt.clientAdd}</p>
                                <p>Service Provider : {agrmnt.providerAdd}</p>
                                <p>Fund : {agrmnt.fund / 1000000000000000000} Ether</p>
                                <p>Fund status : {agrmnt.release ? <span style={{ fontSize: '18px', color: "blueviolet" }}>Received</span> : <span style={{ fontSize: '22px', color: "red" }}>Not Received</span>}</p>
                                
                                {agrmnt.completed ? <h3 style={{ color: "blue", fontSize:'29px' }}>You've done your job!!</h3> : <div><label>Tell client that you completed your work </label><button style={{ color: "blueviolet", backgroundColor: "black", padding: "5px", fontSize:'18px' }}
                                    onClick={() => workCompleted(agrmnt.agreeId)}
                                >Completed Work</button></div>}
                                {/* <button
                                onClick={() => workCompleted(agrmnt.agreeId)}
                            >Completed Work</button> */}




                            </div>
                        </>
                    )
                })}
            </div>
        )
    }
    return (
        <>
            <div>

                <div className="main">
                    <div style={{ textAlign: "center" }}>
                        <h1>Wellcome to Escrow agreement creation </h1><br />
                        <h4>Total Number Of Agreements: {totalNumOfAgreement.toString()}</h4>
                        <p>client : {clientAddress}</p>
                    </div>
                    <div style={{ marginTop: "35px", alignItems: "center", textAlign: "center" }}>
                        <h2>Create Escrow Agreement </h2>

                        <div style={{ marginBottom: "10px" }}>
                            <label>Service Provider </label><input
                                onChange={(e) => {
                                    setServiceProviderAddress(e.target.value)
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <label> Provide Fund </label><input
                                type='number'
                                onChange={(e) => {
                                    setFunds(e.target.value)
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            <label> Agreement ID </label><input
                                type='number'
                                onChange={(e) => {
                                    setAgreementId(e.target.value)
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                            {loading ?
                                <button>Loading...</button>
                                :
                                <button
                                    onClick={createAgreement}
                                >Create Agreement</button>}

                        </div>
                    </div>


                    <div>
                        <h4 style={{ textAlign: 'center' }}>Escrow Agreements created by you</h4>
                        <div className='row'>


                            <div >
                                <button onClick={() => setSelectedTab("client")}
                                >
                                    client
                                </button>
                                <button
                                    onClick={() => setSelectedTab("service provider")}
                                >
                                    service provider
                                </button>
                            </div>



                            {renderTabs()}

                            {/* {everyAgreement && everyAgreement.map((agrmnt) => {
                                if (agrmnt.clientAdd === clientAddress) {
                                    return (
                                        <>
                                            <div style={{ marginLeft: "30%", marginBottom: '55px' }} className='offset-2 col-5'>

                                                <p>Agreement Id : {agrmnt.agreeId}</p>
                                                <p>Client : {agrmnt.clientAdd}</p>
                                                <p>Service Provider : {agrmnt.providerAdd}</p>
                                                <p>Fund : {agrmnt.fund / 1000000000000000000} Ether</p>
                                                <p>Fund status : {agrmnt.release ? 'Relaeased' : 'Not released'}</p>
                                                <button
                                                    onClick={() => release(agrmnt.agreeId)}
                                                >Release Funds</button>


                                                <button
                                                    onClick={() => cancel(agrmnt.agreeId)}
                                                >Cancel</button>

                                            </div>
                                        </>
                                    )
                                }




                                else if (agrmnt.providerAdd === clientAddress)
                                    return (
                                        <>
                                            <div style={{ marginLeft: "30%", marginBottom: '55px' }} className='offset-2 col-5'>

                                                <p>Agreement Id : {agrmnt.agreeId}</p>
                                                <p>Client : {agrmnt.clientAdd}</p>
                                                <p>Service Provider : {agrmnt.providerAdd}</p>
                                                <p>Fund : {agrmnt.fund / 1000000000000000000} Ether</p>
                                                <p>Fund status : {agrmnt.release ? 'Relaeased' : 'Not released'}</p>
                                                <button
                                                    onClick={() => release(agrmnt.agreeId)}
                                                >Release Funds</button>


                                                <button
                                                    onClick={() => cancel(agrmnt.agreeId)}
                                                >Cancel</button>

                                            </div>
                                        </>
                                    );
                                else return ""
                            }

                            )} */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default App;