import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res, UseGuards } from "@nestjs/common";
import { UserDto } from "src/DTOs/User/user.dto";
import { FriendDto } from "src/DTOs/friends/friend.dto";
import { InviteDto } from "src/DTOs/invitation/invite.dto";
import { converationRepositroy } from "src/modules/conversation/conversation.repository";
import { FriendsRepository } from "src/modules/friends/friends.repository";
import { InvitesRepository } from "src/modules/invites/invites.repository";
import { UsersRepository } from "src/modules/users/users.repository";
import { ChannelsService } from "./chat.service";
import { channelDto } from "src/DTOs/channel/channel.dto";
import { Request, Response } from "express";
import { channelMessageDto } from "src/DTOs/channel/channel.messages.dto";
import { channelParams } from "src/DTOs/channel/channel.params.dto";
import { frontData } from "src/DTOs/chat/conversation.dto";
import { messageRepository } from "src/modules/message/message.repository";
import { JwtAuth } from "src/auth/Guards/jwt.guard";
import { channelSettings } from "src/DTOs/settings/setting.channel.dto";
import { ConversationDto } from "src/DTOs/conversation/conversation.dto";
import { UserSettingsDto } from "src/DTOs/settings/settings.user.dto";
import channelsAsConversations, { channelData } from "src/DTOs/channel/channel.response.dto";
import { use } from "passport";



@Controller('Chat')
export class ChatController {
    constructor (private conversation: converationRepositroy
                , private user : UsersRepository
                , private invite : InvitesRepository
                , private friend: FriendsRepository
                , private channel : ChannelsService
                , private message: messageRepository) {}

    @Get('user')
    @UseGuards(JwtAuth)
    async getUserMessages(@Req() req: Request & {user : UserDto}, @Res() res: Response) :Promise<any> {
        try {
            let _user : UserDto = await this.user.getUserById(req.user.id)
            let data : frontData[] = [];
            if (_user) {
                let conversations : ConversationDto[] = await this.conversation.getConversations(_user.id)
                if  (conversations) {
                    for (let index : number = 0; index < conversations.length; index++) {
                        let tmp : frontData = new frontData;
                        let _sender : UserDto = await this.user.getUserById(conversations[index].senderId)
                        let _reciever : UserDto = await this.user.getUserById(conversations[index].recieverId)
                        if (_sender && _reciever && !_sender.bandUsers.includes(_reciever.id) && !_reciever.bandUsers.includes(_sender.id)) {
                            tmp.Conversationid = conversations[index].id   
                            tmp.owner = _user.username
                            tmp.avatar = (_user.username == _sender.username) ? _reciever.avatar : _sender.avatar;
                            tmp.username = (_user.username == _sender.username) ? _reciever.username : _sender.username;
                            tmp.online = false;
                            tmp.id = 0
                            tmp.updatedAt = conversations[index].updatedAt
                            tmp.messages = await this.message.getMessages(conversations[index], req.user.id)
                            data.push(tmp)
                        }
                    }
                }
                else {
                    let empty : frontData;
                    empty.messages = [];
                    empty.Conversationid = null;
                    empty.avatar = null;
                    empty.online = false;
                    empty.owner = null;
                    empty.username = null;
                    res.status(200).json(empty);
                    return
                }
                data.sort((a, b) => new Date(b.updatedAt).valueOf() - new Date(a.updatedAt).valueOf());
                let index: number = 0
                data.forEach((_data) => {
                    _data.id = index++;
                })
                res.status(200).json(data)
                return
            }
            else
                throw('invalid User .')
        }
        catch (error) {
            res.status(400).json('invalid User ...')
        }
    }

    @Get('channel')
    @UseGuards(JwtAuth)
    async getChannels(@Req() req: Request & {user : UserDto}, @Res() res: Response) : Promise<any> {
        try {
            console.log("Sending data to : ", req.user.username);
            let channelData : channelData[] = [];
            let data = await this.channel.getUserChannelNames(req.user.id);
            if (data){
                data.map((name)=> {
                    channelData.push({
                        channelName : name,
                        messages : []
                    })
                })
                res.status(200).json({"username" : req.user.username ,"channels" : channelData});
            }
            else
                res.status(400);
        }
        catch (error) {
            res.status(400)
        }
    }
    
    @Post('channelSearch')
    @UseGuards(JwtAuth)
    async channelSearch(@Req() req: Request & {user : UserDto}, @Res() res: Response, @Body('message') message : string ) : Promise<any> {
        try {
            console.log("recieved : ", message);
            let response : string[] = await this.channel.channelSearchResults(message)
            if (response) {
                res.status(200).json(response);
            }
            else {
                res.status(400).json(response);
            }
        }
        catch (error) {
            res.status(400)
        }
    }

    @Post('channel')
    @UseGuards(JwtAuth)
    async getChannelsMessages(@Req() req: Request & {user : UserDto}, @Body('_channel') _channel : string, @Res() res: Response) : Promise<any> {
        try {
            console.log("recieved : ",_channel);
            let data : channelMessageDto[] =  await this.channel.getChannelMessages(_channel)
            res.status(200).json(data);
        } catch (error) {
            console.log("erroriiiiiii ");
            res.status(400);
        }
    }

    @Get('channelSettings')
    @UseGuards(JwtAuth)
    async   channelSettings(@Req() req: Request & {user : UserDto}, @Res() res: Response) : Promise<any> {
        let data = await this.channel.getChannelSettingsData(req.user.id);
        res.status(200).json(data)
    }

    @Get('userSettings')
    @UseGuards(JwtAuth)
    async getUserDataForSettings(@Req() req: Request & {user: UserDto}, @Res() res: Response) : Promise<any> {
        try {
            let data : UserSettingsDto = new UserSettingsDto() ;
            let userData : UserDto = await this.user.getUserById(req.user.id)
            let invitations : InviteDto[] = await this.invite.getUserInviations(req.user.id)
            let friends : FriendDto[] = await this.friend.getFriends(req.user.id);
            if (userData) {
                data.bandUsers = userData.bandUsers
                if (invitations) {
                    for (let index : number = 0; index < invitations.length; index++) {
                        if (!data.bandUsers.includes(invitations[index].invitationSenderId)) {
                            let tmp : UserDto = await this.user.getUserById(invitations[index].invitationSenderId)
                            if (tmp) {
                                data.invitations.push(tmp.username)
                            }
                        }
                    }
                }
                if (friends) {
                    let tmp : UserDto;
                    for (let index : number = 0; index < friends.length; index++) {
                        if (friends[index].inviteRecieverId == req.user.id && !data.bandUsers.includes(friends[index].inviteSenderId)) {
                            tmp  = await this.user.getUserById(friends[index].inviteSenderId)
                            if (tmp)
                                data.friends.push(tmp.username);
                        }
                        else if (friends[index].inviteSenderId == req.user.id && !data.bandUsers.includes(friends[index].inviteRecieverId)) {
                            tmp = await this.user.getUserById(friends[index].inviteRecieverId)
                            if (tmp)
                                data.friends.push(tmp.username);
                        }
                    }
                }
                let banUsernames : string[] = []
                if (data.bandUsers) {
                    for (let index : number = 0; index < data.bandUsers.length ; index++) {
                        let tmpUser : UserDto = await this.user.getUserById(data.bandUsers[index]);
                        if (tmpUser)
                            banUsernames.push(tmpUser.username) 
                    }
                }
                data.bandUsers = banUsernames;
                data.user = req.user.id;
                res.status(200).json({data})
            }
            else {
                res.status(400).json({message : "User dosen't exist in database ..."})
            }
    } catch(error) {
        res.status(400).json({message : "Error ..."})
    }
}


    @Post('removeFriend')
    @UseGuards(JwtAuth)
    async removeFriend(@Req() req: Request & {user : UserDto}, @Body('username') username: string) : Promise<any> {
        try {
            console.log("recived a request ////////////   ===> ", username);
            let tmp : UserDto = await this.user.getUserByUsername(username)
            if (tmp)
                return await this.friend.deleteFriend(tmp.id, req.user.id);
            // need to add an else to inform the user that the username dosen't exist.
        }
        catch(error) {
            console.log(error);
        }
    }


    @Post('invite')
    @UseGuards(JwtAuth)
    async SendInvitation(@Body('username') username : string, @Req() req: Request & {user : UserDto}, @Res() res: Response) : Promise<any> {
        try {
            if (req.user.username == username) {
                res.status(400).json("Sir tel3eb")
                return 
            }
            let invitation : InviteDto = {
                invitationRecieverId : "",
                invitationSenderId : "",
                inviteStatus : 0,
            }
            let tmpUser : UserDto = await this.user.getUserByUsername(username)
            if (!tmpUser) {
                res.sendStatus(400)
                return 
            }
            invitation.invitationSenderId = req.user.id;
            invitation.invitationRecieverId  = tmpUser.id;
            let tmp : InviteDto = await this.invite.createInvite(invitation);
            if (tmp == null) {
                res.status(400).json("Already friends .")
                return 
            }
            else {
                console.log("succes");
                res.status(200).json(tmp)
                return 
            }
            
            }
        catch (error) {
            console.log(error);
            res.status(400).json({message : "Error ..."})
        }
    }

    @Post('createChannel')
    @UseGuards(JwtAuth)
    async createChannel(@Body() channelData : channelDto, @Req() req: Request & {user : UserDto}, @Res() res: Response) : Promise<any> {
        try {
            console.log(channelData);
            let test : channelDto = await this.channel.createChannel(channelData.name, req.user.id, channelData.IsPrivate, channelData.IsProtected, channelData.password);
            console.log('channel object : ',test);
            if (test) {   
                if (!req.user.achievements.includes('https://res.cloudinary.com/dvmxfvju3/image/upload/v1699323620/qodwzbr6cxd74m14i4ad.png'))
                    this.user.updateAcheivement('https://res.cloudinary.com/dvmxfvju3/image/upload/v1699323620/qodwzbr6cxd74m14i4ad.png', req.user.id)
                res.status(200).json(test)
            }
            else
                res.status(400).json('channel already exists with that name')
            
        }
        catch (error) {
            res.status(400).json("invalid Data .")
        } 
    }


    @Post('BanUser')
    @UseGuards(JwtAuth)
    async   BanUser(@Req() req: Request & {user : UserDto} , @Body('username') username: string, @Res() res: Response) : Promise<any> {
        try {
            console.log("hahowaaaa ====> ", username);
            
            let userToBan : UserDto = await this.user.getUserByUsername(username)
            let requester : UserDto = await this.user.getUserById(req.user.id)
            if (userToBan && requester && !requester.bandUsers.includes(userToBan.id)) {
                let tmp : string = await this.channel.BanUser(req.user, userToBan)
                res.status(200).json(username)
                return 
            }
            else {
                res.status(400).json("user dosen't exist in database .")
            }
        }   catch (error) {
            res.status(400).json("user dosen't exist in database .")
        }
    }
    
    @Post('unBanUser')
    @UseGuards(JwtAuth)
    async   unBanUser(@Req() req: Request & {user : UserDto} , @Body('username') username: string, @Res() res: Response) : Promise<any> {
        try {
            let userTounBan : UserDto = await this.user.getUserByUsername(username)
            let requester : UserDto = await this.user.getUserById(req.user.id)
            if (userTounBan && requester && requester.bandUsers.includes(userTounBan.username)) {
                let tmp :string = await this.channel.unBanUser(req.user, userTounBan)
                console.log(tmp);
                res.status(200).json(userTounBan)
            }
            else
                res.status(400).json("user dosen't exist in database .")    
        } catch (error) {
            res.status(400).json("user dosen't exist in database .")
        }
    }

    @Post('mute')
    @UseGuards(JwtAuth)
    async muteUser(@Req() req: Request & {user : UserDto}, @Body('channel') channel : string, @Body('username') username : string, @Res() res: Response) : Promise<any> {
        try { 
            let check : boolean = await this.channel.muteUser(username, channel, req.user.id)
            if (check){
                res.status(200).json(username)
            } else {
                res.status(400).json(username)
            }
        } catch (error) {
            res.status(400).json(username)
        }
    }

    @Post('AddUserToChannel')
    @UseGuards(JwtAuth)
    async addUserToChannel(@Body('channelName') channelName : string, @Body('username') username : string, @Body('password') password : string, @Req() req : Request & {user : UserDto}, @Res() res: Response) : Promise<any> {
        try {
            let channel : channelDto = await this.channel.getChannelByName(channelName);
            let tmpUser : UserDto = await this.user.getUserByUsername(username);
            let check : boolean;
            if (tmpUser && channel) {
                check = await this.channel.addUserToChannel(tmpUser.id, channel.id, req.user.id);
            }
            if (check)
                res.status(200).json(username)
            else
                res.status(400).json(username)
            }
        catch (error){
            console.log(error);
            
            res.status(400).json(username)
        } 
    }
    

    @Post('kick')
    @UseGuards(JwtAuth)
    async removeUserFromChannel(@Req() req: Request & {user : UserDto}, @Body() data: channelParams, @Res() res: Response) : Promise<any> {
        try {
                let check : boolean = await this.channel.removeUserFromChannel(req.user.id, data.channelName, data.username);
                if (check)
                    res.status(200).json(data.username)
                else
                    res.status(400).json(data.username)
            }
            catch (error) {
                res.status(400).json(data.username)
            }
        }
    
    @Post('BanUserFromChannel')
    @UseGuards(JwtAuth)
    async   banUserFromChannel(@Req() req: Request & {user : UserDto}, @Body() data: channelParams, @Res() res: Response) {
        try {
            let check : boolean = await this.channel.banUserFromChannel(data.username, data.channelName, req.user.id)
            if (check)
                res.status(200).json(data.username)
            else
                res.status(400).json(data.username)
        } catch (error) {
        res.status(400).json("can't ban user .")
        }
    }
    
    @Post('unBanUserFromChannel')
    @UseGuards(JwtAuth)
    async   unBanUserFromChannel(@Req() req: Request & {user : UserDto}, @Body() data: channelParams, @Res() res: Response) {
        try {
            let check : boolean = await this.channel.unBanUserFromChannel(data.username, data.channelName, req.user.id)
            if (check)
                res.status(200).json(data.username)
            else
                res.status(400).json(data.username)
        } catch (error) {
        res.status(400).json("can't ban user .")
        }
    }
    

    @Post('deleteInvite')
    @UseGuards(JwtAuth)
    async deleteInvite(@Req() req: Request & {user : UserDto}, @Body('username') username : string,  @Res() res: Response) : Promise<any> {
        try {
            let tmpUser : UserDto = await this.user.getUserByUsername(username)
            if (!tmpUser) {
                res.status(400).json("user dosen't exist in database ...")
                return 
            }
            let find : InviteDto = await this.invite.getInviteToValidate(tmpUser.id, req.user.id)
            if (find)
                await this.invite.deleteInvite(find.id)
            console.log('deleted ...');
            res.status(200)
        } catch (error) {
            res.status(400)
        }
    }

    @Post('joinChannel')
    @UseGuards(JwtAuth)
    async joinChannelRequest(@Req() req: Request & {user : UserDto}, @Body('channelName') channelName : string, @Res() res: Response) : Promise<any> {
        console.log(channelName);
        res.status(200);
    } 

    @Post('accepteInvite')
    @UseGuards(JwtAuth)
    async accepteInvite(@Req() req: Request & {user : UserDto}, @Body('username') username : string, @Res() res: Response) : Promise<any> {
        try {
            console.log('at least got here ??');
            
            let tmpUser : UserDto = await (await this.user.getUserByUsername(username))
            let invitationSenderId : string = tmpUser.id
            let invitationRecieverId : string = req.user.id
            
            let tmp : InviteDto = await this.invite.getInviteToValidate(invitationSenderId, invitationRecieverId);
            console.log("tmp ===> : ",tmp);
            if (!tmp) {
                res.status(400).json("no Invite to accepte")
                return
            }
            console.log("invite ====> ", username);
            await this.invite.deleteInvite(tmp.id);
            let data : FriendDto = await this.friend.createFriend(new FriendDto(invitationRecieverId, invitationSenderId, ''), req.user.id)
            res.status(200).json(data);
        }
        catch (error) {
            res.status(400)
        }
    }
    

    @Post('addAdminToChannel')
    @UseGuards(JwtAuth)
    async   addAdminToChannel(@Req() req : Request & {user : UserDto},  @Body() data: channelParams, @Res() res: Response) {
        try {
            let check : boolean = await this.channel.AddAdminToChannel(data.username, data.channelName, req.user.id)
            console.log("addAdminToChannel : ", check);
            if (check)
                res.status(200).json(data.username)
            else
                res.status(400).json(data.username)
        }   
        catch (error) {
            res.status(400).json(data.username)
        }
    }
    
    @Post('RemoveAdminFromChannel')
    @UseGuards(JwtAuth)
    async   RemoveAdminFromChannel(@Req() req : Request & {user : UserDto},  @Body() data: channelParams, @Res() res: Response) {
        try {
            let check : boolean = await this.channel.RemoveAdminFromChannel(data.username, data.channelName, req.user.id)
            if (check)
                res.status(200).json(data.username)
            else
                res.status(400).json(data.username)
        }   
        catch (error) {
            res.status(400).json(data.username)
        }
    }
    // @UseGuards(JwtAuth)
    // @Post('addPasswordToChannel')
    // async addPasswordToChannel(@Body() channleData : channelDto, @Req() req: Request & {user : UserDto}, @Res() res: Response) {
    //     try {
    //         let channel : channelDto = await this.channel.getChannelByName(channleData.name)
    //         if (channel && channel.owner == req.user.id) {
    //             await this.channel.setPasswordToChannel(channleData.password, channleData.name)
    //         }
    //         res.status(200)
    //     }
    //     catch (error) {
    //         res.status(400)
    //     }
    // }
    
    // @UseGuards(JwtAuth)
    // @Post('removePasswordToChannel')
    // async removePasswordToChannel(@Body() data : channelParams , @Req() req: Request & {user : UserDto}, @Res() res: Response) {
    //     try {
    //         let channel : channelDto = await this.channel.getChannelByName(data.channelName)
    //         if (channel && channel.owner == req.user.id) {
    //             await this.channel.unsetPasswordToChannel(data.channelName)
    //         }
    //         res.status(200)
    //     }
    //     catch (error) {
    //         res.status(400)
    //     }
    // }


    // @Post('getChannelMessages')
    // @UseGuards(JwtAuth)
    // async   getChannelMessages(@Body() data : channelParams, @Req() req: Request & {user : UserDto}, @Res() res: Response) : Promise<any>{
    //     try {
    //         let endValue : channelMessageDto[] = []
    //         let check_channel : channelDto = await this.channel.getChannelByName(data.channelName)
    //         if (check_channel && check_channel.users.includes(req.user.id)) {
    //             endValue = await this.channel.getChannelMessages(data.channelName)
    //         }
    //         res.status(200).json(endValue)
    //     }
    //     catch (error) {
    //         res.status(400)
    //     }
    // }
}