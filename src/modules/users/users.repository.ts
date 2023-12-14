import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma.service';
import { UserDto } from 'src/DTOs/User/user.dto';
import { title } from 'process';

@Injectable()
export class UsersRepository {
    constructor (private prisma: PrismaService) {}

    async createUser (params : {data : UserDto}) : Promise<UserDto> {
        const { data } = params;
        return await this.prisma.user.create({data});
    }

    async getUserById (playerId : string) : Promise<UserDto | null> {
        // console.log(`playerId : ${playerId}`)
        const data: UserDto = await this.prisma.user.findFirst({where : {
            id : playerId,
        }});
        if (!data)
            return null; // neeed to throw an error
        return data;
    }
    
    async getUserByUsername (username : string) : Promise<UserDto | null> {
        const data: UserDto = await this.prisma.user.findFirst({where : {
            username : username,
        }});
        if (!data)
            return null; // neeed to throw an error
        return data;
    }

    async updateAvatar (id: string, _avatar: string) : Promise<UserDto> {
        return await this.prisma.user.update({
            where: {id},
            data: {
                avatar: _avatar,
            }
        })
    }

    async updateUsername(id: string, _username : string) : Promise<any> {
        return await this.prisma.user.update({where : {id},
            data : {
                username : _username,
            }})
    }

    async getUserWith(data : string) : Promise<UserDto[]> {
        return await this.prisma.user.findMany({ where : { username : { contains : data, }}});
    }
    async updateAcheivement(_title : string, id : string) : Promise<UserDto> {
        let userAchievements : string[] = (await this.prisma.user.findUnique({where : {id}})).achievements
        let found : boolean = false;
        userAchievements.forEach((achievement) => {
            if (achievement == title)
                found = true;
        })
        if (!found)
            userAchievements.push(_title);
        return await this.prisma.user.update({where : {id},
            data : {
                achievements : userAchievements,
            }})
        }
    
    async getAllUsers() : Promise<UserDto[]> {
            return await this.prisma.user.findMany();
    }

    async updateUserOnlineStatus(status : boolean, userId : string) {
        await this.prisma.user.update({where : {id : userId},
            data : {
                online : status,
            }    
        })
    }
    async deleteUser (id : string) : Promise <string> {
        await this.prisma.user.delete({where : {id}});
        return "deleted";
    }

    async updateIsEnabled(id: string, isenabled: boolean): Promise<UserDto> {

        const user = await this.prisma.user.findUnique({where: {id}})

        if (user) {
            return await this.prisma.user.update({where: {id},
                data: {
                    IsEnabled: isenabled,
                    TwoFASecret: null,
                }});
        }
        else
            throw new UnauthorizedException('user not valid !!')
    }
}
