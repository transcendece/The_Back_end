import { Injectable } from "@nestjs/common";
import { ConversationDto } from "src/DTOs/conversation/conversation.dto";
import { PrismaService } from "src/modules/database/prisma.service";
import { PassThrough } from "stream";

@Injectable()
export class converationRepositroy {
    constructor (private Prisma : PrismaService) {}

    async createConversation(_recieverId : string, _senderId : string) : Promise<ConversationDto> {
        return await this.Prisma.conversation.create({data : {
            recieverId : _recieverId,
            senderId : _senderId,
        }})
    }

    async numberOfConversations(_id : string) : Promise<number> {
        let count  = await this.Prisma.conversation.findMany({where : {
            OR : [
                {
                    senderId : _id,
                },
                {
                    recieverId : _id,
                }]}})
        return count.length;
    }

    async getConversations(_id : string) : Promise<ConversationDto[]> {
        let counversations : ConversationDto[]  = await this.Prisma.conversation.findMany({where : {
            OR : [
                {
                    senderId : _id,
                },
                {
                    recieverId : _id,
                }]
            },
            orderBy: {
                updatedAt: 'asc',
              },
            })
        console.log("00000000000000000000000000000000 ===> ",counversations);    
        return counversations;
    }

    async findConversations(_recieverId : string, _senderId : string) : Promise<ConversationDto | null> {
        return await this.Prisma.conversation.findFirst({where : {
            OR : [
                {   senderId : _senderId,
                    recieverId : _recieverId
                },
                {
                    recieverId : _senderId,
                    senderId : _recieverId
                }
            ]
        }})
    }

async updateConversationDate(conversationId: string) {
    await this.Prisma.conversation.update({where : {id : conversationId},
        data : {
            updatedAt : new Date()
        }
    })
}

    async deleteConversation(conversationData: ConversationDto ) : Promise<string> {
        await this.Prisma.conversation.delete({where : {id : conversationData.id,}})
        return "deleted"
    }
}