import { Injectable } from '@nestjs/common';
import { MutedUserDto } from 'src/DTOs/User/mutedUser.dto';
import { UserDto } from 'src/DTOs/User/user.dto';
import { channelDto } from 'src/DTOs/channel/channel.dto';
import { channelMessageDto } from 'src/DTOs/channel/channel.messages.dto';
import { PrismaService } from 'src/modules/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { channelOnUser } from 'src/DTOs/channel/channelOnUser.dto';
import { channelSettings } from 'src/DTOs/settings/setting.channel.dto';
import { type } from 'os';
import { plainToClass } from "class-transformer";
import { errorUtil } from 'zod/lib/helpers/errorUtil';
import { is } from 'valibot';

export type ChannelOnUserCreateInput = {
  userId: string;
  channelId: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  isBanned?: boolean;
  isMuted?: boolean;
  until?: Date;
 };

 export class _channelSettings {
  channelName : string;
  users      : string[];
  bandUsers  : string[];
  admins     : string[];
  mutedUsers : string[];
}

@Injectable()
export class ChannelsService {
 constructor(private prisma: PrismaService) {}

    async channelSearchResults(channel : string) : Promise<string[]> {
      let data : channelDto[] = await this.prisma.channel.findMany({
        where : {
          name : {
            contains : channel
        },
          IsPrivate : false
        }
      })
      let response : string[] = []
      data.map((element)=> {
        response.push(element.name)
      })
      console.log(response);
      return response
    }  

    async createChannel(channelName: string, ownerId: string, Private: boolean , hasPass : boolean, Pass : string) {
      try {
        let checkIfChannelExist : channelDto = await this.prisma.channel.findFirst({where : {
        name : channelName
      }})
      if (checkIfChannelExist)
        return null
      let _tmp : string[] = ['','']
      if (hasPass) {
        _tmp  = await this.hashPassword(Pass)
      } else {
          _tmp[0] = ''
          _tmp[1] = ''
      }
      const channel : channelDto = await this.prisma.channel.create({
        data: {
          name: channelName,
          owner: ownerId,
          IsPrivate : Private,
          IsProtected : hasPass,
          password : _tmp[1],
          passwordHash : _tmp[0],
          users : {
            create : {
              isAdmin: true,
              isOwner: true,
              isBanned: false,
              isMuted: false,
                until: new Date,
                user : {
                  connect : {
                    id : ownerId
                  }
                },
            }
          },
        }
      });
      console.log('created the following : ', channel);
      return channel;
    } catch (error) {
      console.log('gotchaaa yaa .... : ');
    }
     }
     


     async getUserChannelNames(id : string) : Promise<string[]> {
      let data = await this.prisma.channelOnUser.findMany({
        where : {
          userId : id,
        },
        include :{
          channel : {
            select : {
              name : true,
            }
          }
        }
      });
      let channelNames : string[] = data.map(item => item.channel.name);
      return channelNames;
   }
   


  async getChannelUsersId(channel :string ) : Promise<string[]> {
    let data = await this.prisma.channelOnUser.findMany({
      where : {
        channel : {
          name : channel,
        }
      }
    })
    let ids : string[] = []
    if (data) {

      data.map((user)=> {
        ids.push(user.userId)
      })
      return ids;
    }
    else
      return []
  }


  async getChannelSettingsData(userId : string) : Promise<any> {
    let data = await this.prisma.channelOnUser.findMany({
      where : {
          userId : userId,
          isAdmin : true,
      },
      include : {
          channel : {
              include : {
                 users : {
                  include : {
                    user : {
                      select : {
                        username : true,
                      }
                    }
                  }
                 },
              }
          },
      },
  });
  // return data
  let channelSettingsArray: _channelSettings[] = [];
  console.log(data);
  data.forEach((channelData) => {
      let channelSettingsInstance = new _channelSettings();
      channelSettingsInstance.channelName = channelData.channel.name;
      channelSettingsInstance.users = [];
      channelSettingsInstance.bandUsers = [];
      channelSettingsInstance.admins = [];
      channelSettingsInstance.mutedUsers = [];

      channelData.channel.users.forEach((userData) => {
        console.log("user : ", userData);
        
          if (userData.isAdmin && !userData.isBanned) {
              channelSettingsInstance.admins.push(userData.user.username);
          }
          if (userData.isBanned) {
              channelSettingsInstance.bandUsers.push(userData.user.username);
          }
          if (userData.isMuted && !userData.isBanned) {
              channelSettingsInstance.mutedUsers.push(userData.user.username);
          }
          if (!userData.isBanned) {
            channelSettingsInstance.users.push(userData.user.username);
          }
      });

      channelSettingsArray.push(channelSettingsInstance);
  });

  return channelSettingsArray;
  }



  async hashPassword(password: string): Promise<string[]> {
    const salt : string = await bcrypt.genSalt();
    let tmp : string[] = []
    tmp.push(salt);
    console.log("hash : ", salt);
    
    let pass : string = await bcrypt.hash(password, salt);
    tmp.push(pass)
    console.log("pass : ", pass);
    return tmp
  }

  async checkPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  async removeUserFromChannel(requesterId: string, channelName: string, userToRemove : string) : Promise<boolean> {
    try  {
      let idToDelete : UserDto = await this.prisma.user.findFirst({where : {
      username : userToRemove,
    }})
    let _channel : channelDto = await this.prisma.channel.findFirst({where : {
      name : channelName,
    }})
    if (!idToDelete || !_channel)
      return false
    let requester : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        channelId : _channel.id,
        userId : requesterId
      }
    })
    if (requester && requester.isAdmin) {
        let tmpChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
          where : {
            userId : idToDelete.id,
            channelId : _channel.id,
          }
        })
        if (!tmpChannelOnUser || tmpChannelOnUser.isOwner) {
          throw ('user not in channel Or trying to kick owner ...')
        }
        await this.prisma.channelOnUser.delete({
          where: {
            userId_channelId: {
              userId: tmpChannelOnUser.userId,
              channelId: tmpChannelOnUser.channelId,
            },
          },
        });
        console.log('deleted ...');
    }
    else {
      return false
    }
    return true;
  }
  catch (error) {
    console.log('error in remove user from channel .... ', error);
    return false;
    }
  }

 async  muteUser(UserToMute: string, channelName: string, requester : string) : Promise<boolean> {
  try {
    const now : Date = new Date();
    let ToMute : UserDto = await this.prisma.user.findFirst({
      where : {
        username : UserToMute,
      }
    })
    let channel : channelDto = await this.prisma.channel.findFirst({
      where : {
        name : channelName
      }
    })
    if (!channel || !ToMute)
      return false
    let ToMuteChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : ToMute.id,
        channelId : channel.id,
      }
    })
    let RequesterChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : requester,
        channelId : channel.id
      }
    })
    if (!ToMuteChannelOnUser || ToMuteChannelOnUser.isMuted || ToMuteChannelOnUser.isOwner || !RequesterChannelOnUser || !RequesterChannelOnUser.isAdmin ) {
      return false
    } 
    await this.prisma.channelOnUser.update({
        where: {
          userId_channelId: {
            userId: ToMute.id,
            channelId: channel.id,
          },
        },
        data : {
          isMuted : true,
          until : new Date(now.getTime() + 5 * 60 * 1000)
        }
      });
      return true;
  }
  catch (error) {
    console.log(error);
  }
}

async  KickUserFromChannel(UserToKick: string, channelName: string, requester : string) : Promise<boolean> {
  try {
    let ToKick : UserDto = await this.prisma.user.findFirst({
      where : {
        username : UserToKick,
      }
    })
    let channel : channelDto = await this.prisma.channel.findFirst({
      where : {
        name : channelName
      }
    })
    if (!channel || !ToKick)
      return false
    let ToKickChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : ToKick.id,
        channelId : channel.id,
      }
    })
    let RequesterChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : requester,
        channelId : channel.id
      }
    })
    if (!ToKickChannelOnUser || ToKickChannelOnUser.isOwner || !RequesterChannelOnUser || !RequesterChannelOnUser.isAdmin ) {
      return false
    } 
    await this.prisma.channelOnUser.delete({
        where: {
          userId_channelId: {
            userId: ToKick.id,
            channelId: channel.id,
          },
        }
      });
      return true;
  }
  catch (error) {
    console.log(error);
  }
}


  async createChannelMessage(message : channelMessageDto) : Promise<any> {
   console.log('message recieved in channel : ',message);
   if (message) {
     console.log('creating channel message', message);
     return await this.prisma.channelMessage.create({data : {
       sender : message.sender,
       content : message.content,
       channelName : message.channelName,
     }})
     
   }
  }

  // async getUserChannels(id : string) : Promise<channelDto[]> {
  //  return await this.prisma.channel.findMany({where : {
  //    users : {
  //      has : id,
  //    }
  //  }})
  // }


  // async getChannelSettingsData(id : string) : Promise<channelDto[]>{
  //  return await this.prisma.channel.findMany({where : {
  //    admins : {
  //      has : id,
  //    }
  //  }})
  // }

 async banUserFromChannel(username: string, channelName: string, requester : string) : Promise<boolean> {
  try {
    let user : UserDto = await this.prisma.user.findFirst({
      where : {
        username : username,
      }
    })
    let channel : channelDto = await this.prisma.channel.findFirst({
      where: {
        name : channelName,
      }
    })
    if (!user || !channel)
      return false
    let channelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where :{
          userId : user.id,
          channelId : channel.id,
      }
    })
    let _requester : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where :{
          userId : requester,
          channelId : channel.id,
      }
    })
    if (!channelOnUser || channelOnUser.isBanned || channelOnUser.isOwner || !_requester || !_requester.isAdmin)
      return false;
      await this.prisma.channelOnUser.update({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: channel.id,
          },
        },
        data : {
          isBanned : true,
          isAdmin : false,
        }
      });
      return true;
    }
    catch (error) {
      console.log('faced an error while banning a user ...');
      return false
  } 
 }
 
 async unBanUserFromChannel(username: string, channelName: string, requester : string) : Promise<boolean> {
  try {
    let user : UserDto = await this.prisma.user.findFirst({
      where : {
        username : username,
      }
    })
    let channel : channelDto = await this.prisma.channel.findFirst({
      where: {
        name : channelName,
      }
    })
    if (!user || !channel)
      return false
    let channelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : user.id,
        channelId : channel.id,
      }
    })
    let _requester : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where :{
          userId : requester,
          channelId : channel.id,
      }
    })

    if (!channelOnUser || !_requester || !_requester.isAdmin)
      return false;
      await this.prisma.channelOnUser.update({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: channel.id,
          },
        },
        data : {
          isBanned : false
        }
      });
      return true;
  }
    catch (error) {
      console.log('faced an error while banning a user ...');
      return false
  } 
 }
 
 async AddAdminToChannel(username: string, channelName: string, requester : string) : Promise<boolean> {
  try {
    let user : UserDto = await this.prisma.user.findFirst({
      where : {
        username : username,
      }
    })
    let channel : channelDto = await this.prisma.channel.findFirst({
      where: {
        name : channelName,
      }
    })
    if (!user || !channel)
      return false
    let channelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : user.id,
        channelId : channel.id,
      }
    })
    let _requester : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where :{
          userId : requester,
          channelId : channel.id,
      }
    })

    if (!channelOnUser || channelOnUser.isBanned || !_requester || !_requester.isOwner || channelOnUser.isAdmin)
      return false;
    await this.prisma.channelOnUser.update({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: channel.id,
          },
        },
        data : {
          isAdmin : true
        }
      });
      return true;
  }
    catch (error) {
      console.log('faced an error while adding and admin in channel ...');
      return false
  } 
 }
 
 async RemoveAdminFromChannel(username: string, channelName: string, requester : string) : Promise<boolean> {
  try {
    let user : UserDto = await this.prisma.user.findFirst({
      where : {
        username : username,
      }
    })
    let channel : channelDto = await this.prisma.channel.findFirst({
      where: {
        name : channelName,
      }
    })
    if (!user || !channel)
      return false
    let channelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : user.id,
        channelId : channel.id,
      }
    })
    let _requester : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where :{
          userId : requester,
          channelId : channel.id,
      }
    })

    if (!channelOnUser || channelOnUser.isOwner || !_requester || !_requester.isOwner)
      return false;
      await this.prisma.channelOnUser.update({
        where: {
          userId_channelId: {
            userId: user.id,
            channelId: channel.id,
          },
        },
        data : {
          isAdmin : false
        }
      });
      return true;
  }
    catch (error) {
      console.log('faced an error while adding and admin in channel ...');
      return false
  } 
 }

 async getChannelByName(channelName: string) : Promise<channelDto> {
    return await this.prisma.channel.findFirst({where : {name : channelName}});
 }

 async addUserToChannel(userId: string, channelId: string, requester : string): Promise<boolean> {
  try {
    console.log('adding user to channel ..... userid : ', userId, " channelId : ", channelId);
    const existingUser : UserDto = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return false
    }

    const existingChannel : channelDto = await this.prisma.channel.findUnique({
      where: {
        id: channelId,
      },
    });

    if (!existingChannel) {
      return false
    }

    let requsterChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : requester,
        channelId : existingChannel.id,
      }
    })
    if (!requsterChannelOnUser || !requsterChannelOnUser.isAdmin)
      return false
    let existingChannelOnUser : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : existingUser.id,
        channelId : existingChannel.id,
      }
    })
    if (existingChannelOnUser || existingChannelOnUser)
      return false;
    const channelOnUser = await this.prisma.channelOnUser.create({
      data: {
      isAdmin: false,
      isOwner: false,
      isBanned: false,
      isMuted: false,
      until: new Date,
      channel : {
        connect : {
          id : channelId
        }
      },
      user : {
        connect : {
          id : userId
        }
      },
      }
    });
    console.log("=====> ",channelOnUser);
    
    return true
  } catch (error) {
    console.error("Error adding user to channel:", error);
    return false
  }
}
 

 async deleteChannel(channelId : string) : Promise<any> {
    await this.prisma.channel.delete({where : {id : channelId}})
 }
 
 
 async setPasswordToChannel(password: string, channelName : string) {
  console.log('testing', password);
  
    let channel : channelDto = await this.prisma.channel.findFirst({where : { name :channelName}})
    if (channel && password.length) {
      return await this.prisma.channel.update({where : {id: channel.id},
      data : {
        IsProtected : true,
        password : password,
      }})
    }
 }
 
 async unsetPasswordToChannel(channelName : string) {
    let channel : channelDto = await this.prisma.channel.findFirst({where : { name :channelName}})
    if (channel) {
      return await this.prisma.channel.update({where : {id: channel.id},
      data : {
        IsProtected : false,
        password : '',
      }})
    }
 }
 
 async BanUser(user: UserDto, ban : UserDto): Promise<string> {
    let tmp : string[] = []
    if (user && ban) {
      tmp = user.bandUsers;
      tmp.push(ban.id)
      
      let check = await this.prisma.user.update({where : {id : user.id}, 
        data : {bandUsers : tmp},
      })
      console.log(check);
      return `user banned succesfully.`
    }
    return `user already banned or dosen't exist.`
}
 
async unBanUser(user: UserDto, ban : UserDto): Promise<string> {
    let tmp : string[] = []
    if (user && ban) {
      user.bandUsers.forEach((user) => {
        if (user != ban.username)
          tmp.push(user)
      })
      let check = await this.prisma.user.update({where : {id : user.id}, 
        data : {bandUsers : tmp},
      })
      console.log(check);
      return `user unbanned succesfully.`
    }
    return `user is not in the ban list.`
}

 async getChannelMessages(channel : string) : Promise<channelMessageDto[]> {
  console.log('getting messages of : ',channel);
  
  let tmp =  await this.prisma.channelMessage.findMany({where : {channelName : channel}})
  console.log(tmp);
  return tmp
 }

 async canSendMessageToChannel(id : string, channelName : string) : Promise<boolean> {
  try {
    let user : channelOnUser = await this.prisma.channelOnUser.findFirst({
      where : {
        userId : id,
        channel : {
          name : channelName,
        }
      }
    })
    if (!user || user.isBanned || user.isMuted)
    return false
  return true
  }
  catch (error) {
    return false;
  }
 }
 }

