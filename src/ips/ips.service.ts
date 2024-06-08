import { BlockchainService } from './../blockchain/blockchain.service';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateIpDto } from './dto/create-ip.dto';
import { UpdateIpDto } from './dto/update-ip.dto';
import sha256File from 'sha256-file';
import { PrismaService } from 'prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import { User } from '@prisma/client';
import { privateToPublic } from 'ethereumjs-util';

@Injectable()
export class IpsService {

  constructor(private prisma: PrismaService, private blockchainService: BlockchainService, private usersService: UsersService) {

  }

  async create(createIpDto: CreateIpDto, file: Express.Multer.File, ownerId: string) {

    // Get the user and check if exists
    const user = await this.usersService.findOne(ownerId);

    if (!user) {
      throw new InternalServerErrorException('User not found');
    }

    const privateKeyBuffer: Buffer = Buffer.from(user.ethPrivateKey.replace('0x', ''), 'hex');

    // Derive the public key from the private key (uncompressed format)
    const publicKeyBuffer: Buffer = privateToPublic(privateKeyBuffer);

    // Create a temp copy of the file
    fs.copyFileSync(file.path, './uploads/' + file.filename + '.tmp');

    // Add public key (uncompressed) to raw content of the temp file
    fs.appendFileSync('./uploads/' + file.filename + '.tmp', publicKeyBuffer);

    // Generate the hash of the file + public key (in order to not expose the document and to allow ownership verification)
    const documentHash = sha256File('./uploads/' + file.filename + '.tmp');

    // Remove the temp file
    fs.unlinkSync('./uploads/' + file.filename + '.tmp');

    const data = await this.prisma.intellectualProperty.create({
      data: {
        ...createIpDto,
        price: this.blockchainService.web3.utils.toWei(createIpDto.price, 'ether'),
        fileName: file.filename,
        documentHash,
        status: 'GENERATING PROOF...',
        owner: {
          connect: {
            id: ownerId,
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        }
      }
    });

    // Register the IP on the blockchain (generate proof and send transaction)
    // TODO IN FUTURE PROJECTS: Move this to a queue system or a background job
    // ! This is a blocking operation and can take a long time
    const registeredIp = await this.registerIP(documentHash, user, data.id);

    return registeredIp;

  }

  findAll() {
    return this.prisma.intellectualProperty.findMany({
      where: {
        status: 'SUCCESSFULLY REGISTERED',
        deleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  findAllByOwner(ownerId: string) {
    return this.prisma.intellectualProperty.findMany({
      where: {
        ownerId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        createdAt: true,
        updatedAt: true,
        intellectualPropertyTransactions: {
          select: {
            id: true,
            buyer: {
              select: {
                id: true,
                name: true,
                ethAddress: true,
              }
            },
            price: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });
  }

  findOne(id: string) {
    return this.prisma.intellectualProperty.findUnique({
      where: {
        id,
        deleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      }
    }).then((ip) => {
      if (!ip) {
        throw new NotFoundException('Intellectual Property not found');
      }
      return ip;
    });
  }

  // ! Not implemented in the frontend
  update(id: string, updateIpDto: UpdateIpDto, ownerId: string) {

    return this.prisma.intellectualProperty.update({
      where: {
        id,
        ownerId,
      },
      data: {
        ...updateIpDto,
        price: this.blockchainService.web3.utils.toWei(updateIpDto.price, 'ether'),
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        createdAt: true,
        updatedAt: true,
        intellectualPropertyTransactions: {
          select: {
            id: true,
            buyer: {
              select: {
                id: true,
                name: true,
                ethAddress: true,
              }
            },
            price: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    }).then((ip) => {
      if (!ip) {
        throw new NotFoundException('Intellectual Property not found');
      }
      return ip;
    });

  }

  // ! Not implemented in the frontend
  remove(id: string, ownerId: string) {
    return this.prisma.intellectualProperty.update({
      where: {
        id,
        ownerId,
      },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        deletedAt: true,
        intellectualPropertyTransactions: {
          select: {
            id: true,
            buyer: {
              select: {
                id: true,
                name: true,
                ethAddress: true,
              }
            },
            price: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    }).then((ip) => {
      if (!ip) {
        throw new NotFoundException('Intellectual Property not found');
      }
      return ip;
    });

  }

  // ! Not implemented in the frontend
  restore(id: string, ownerId: string) {
    return this.prisma.intellectualProperty.update({
      where: {
        id,
        ownerId,
      },
      data: {
        deleted: false,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        owner: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        deletedAt: true,
        intellectualPropertyTransactions: {
          select: {
            id: true,
            buyer: {
              select: {
                id: true,
                name: true,
                ethAddress: true,
              }
            },
            price: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    }).then((ip) => {
      if (!ip) {
        throw new NotFoundException('Intellectual Property not found');
      }
      return ip;
    });

  }

  // ! Not implemented in the frontend
  async buy(id: string, buyerId: string) {

    const isBought = await this.prisma.intellectualPropertyTransaction.findFirst({
      where: {
        propertyId: id,
        buyerId,
      }
    }).then((transaction) => {
      return transaction ? true : false;
    });

    if (isBought) {
      throw new BadRequestException('You have already bought this Intellectual Property');
    }

    // Get the user eth address (using usersService findOne) and check if has enough balance
    const buyer = await this.usersService.findOne(buyerId);

    // Get the IP price
    const ip = await this.findOne(id);

    if (parseInt(ip.price) === 0) {
      throw new BadRequestException('This Intellectual Property is free');
    }

    if (ip.owner.id === buyerId) {
      throw new BadRequestException('You cannot buy your own Intellectual Property');
    }

    // Check if the buyer has enough balance
    const balance = parseInt((await this.blockchainService.getBalance(buyer.ethAddress)).toString());

    if (balance < parseInt(this.blockchainService.web3.utils.fromWei(ip.price, 'ether'))) {
      throw new BadRequestException('Insufficient balance');
    }

    // Transfer the IP price to the owner
    const transaction = await this.blockchainService.web3.eth.accounts.signTransaction({
      from: buyer.ethAddress,
      to: ip.owner.ethAddress,
      value: ip.price,
      gas: 2000000,
      gasPrice: this.blockchainService.web3.utils.toWei('10', 'gwei'),
      gasLimit: 2000000,
    }, buyer.ethPrivateKey);

    await this.blockchainService.web3.eth.sendSignedTransaction(transaction.rawTransaction);

    return this.prisma.intellectualPropertyTransaction.create({
      data: {
        buyerId,
        propertyId: id,
        price: ip.price,
        transactionHash: transaction.transactionHash,
      },
      select: {
        id: true,
        buyer: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        property: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            documentHash: true,
            transactionProofHash: true,
            owner: {
              select: {
                id: true,
                name: true,
                ethAddress: true,
              }
            }
          }
        },
        price: true,
        transactionHash: true,
        createdAt: true,
      }
    });
  }

  async registerIP(documentHash: string, user: User, ipId: string) {


    const { proof, publicSignals } = await this.blockchainService.generateProof(user.ethPrivateKey, documentHash).then(async (res) => {

      await this.prisma.intellectualProperty.update({
        where: {
          id: ipId
        },
        data: {
          status: 'PROOF GENERATED',
        }
      });

      return res;

    }).catch(async (err) => {

      await this.prisma.intellectualProperty.update({
        where: {
          id: ipId
        },
        data: {
          status: 'ERROR DURING PROOF GENERATION',
        }
      });

      return { proof: null, publicSignals: null };

    });

    if (proof && publicSignals) {

      // Convert the data into Solidity calldata that can be sent as a transaction
      const calldataBlob = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);

      const argv = calldataBlob.replace(/["[\]\s]/g, "").split(",").map((x: string | number | bigint | boolean) => BigInt(x).toString());

      const a = [argv[0], argv[1]];
      const b = [
        [argv[2], argv[3]],
        [argv[4], argv[5]],
      ];
      const c = [argv[6], argv[7]];
      const Input: any[] = [];

      for (let i = 8; i < argv.length; i++) {
        Input.push(argv[i]);
      }

      const ip = await this.blockchainService.sendIPTransaction(a, b, c, Input, user.ethAddress, user.ethPrivateKey).then(async (res) => {

          return await this.prisma.intellectualProperty.update({
            where: {
              id: ipId
            },
            data: {
              status: 'SUCCESSFULLY REGISTERED',
              transactionProofHash: res.transactionHash.toString(),
            },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              documentHash: true,
              transactionProofHash: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              deletedAt: true,
              deleted: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  ethAddress: true,
                }
              },
              intellectualPropertyTransactions: {
                select: {
                  id: true,
                  buyerId: true,
                  price: true,
                  createdAt: true,
                  updatedAt: true,
                  buyer: {
                    select: {
                      id: true,
                      name: true,
                      ethAddress: true,
                    }
                  }
                }
              }
            }
          });

        }).catch(async (err) => {

          return await this.prisma.intellectualProperty.update({
            where: {
              id: ipId
            },
            data: {
              status: 'ERROR DURING TRANSACTION',
            },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              documentHash: true,
              transactionProofHash: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              deletedAt: true,
              deleted: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  ethAddress: true,
                }
              },
              intellectualPropertyTransactions: {
                select: {
                  id: true,
                  buyerId: true,
                  price: true,
                  createdAt: true,
                  updatedAt: true,
                  buyer: {
                    select: {
                      id: true,
                      name: true,
                      ethAddress: true,
                    }
                  }
                }
              }
            }
          });

        });

    }


  }

  // ! Not implemented in the frontend
  findAllBoughtByUser(userId: string) {

    return this.prisma.intellectualPropertyTransaction.findMany({
      where: {
        buyerId: userId,
      },
      select: {
        id: true,
        buyer: {
          select: {
            id: true,
            name: true,
            ethAddress: true,
          }
        },
        property: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            documentHash: true,
            transactionProofHash: true,
            owner: {
              select: {
                id: true,
                name: true,
                ethAddress: true,
              }
            },
            createdAt: true,
            updatedAt: true,
          }
        },
        price: true,
        transactionHash: true,
        createdAt: true,
      }
    });

  }

}
