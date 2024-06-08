import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'prisma/prisma.service';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Create a new user in the database
  create(createUserDto: CreateUserDto, ethAccount: {address: string, privateKey: string}) {
    return this.prisma.user
      .create({
        data: {
          ...createUserDto,
          ethAddress: ethAccount.address,
          ethPrivateKey: ethAccount.privateKey,
        }
      })
      .then((user) => {
        return user;
      });
  }

  findProfile(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        ethAddress: true,
        createdAt: true,
        updatedAt: true,
        intellectualProperties: {
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
        },
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  findOneByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
      },
    });
  }

  findOneByName(name: string) {
    return this.prisma.user.findFirst({
      where: {
        name,
      },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: updateUserDto,
    });
  }

  findUserUploadedIps(id: string) {
    return this.prisma.intellectualProperty.findMany({
      where: {
        ownerId: id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        documentHash: true,
        transactionProofHash: true,
        status: true,
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
  }
}
