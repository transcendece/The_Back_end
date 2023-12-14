import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { UserDto } from "src/DTOs/User/user.dto";
import { JwtAuth } from "src/auth/Guards/jwt.guard";
import { UsersRepository } from "src/modules/users/users.repository";

@Controller('search')
export class SearchController {
    constructor (
        private user: UsersRepository,
    ) {}

    @Get(':data')
    @UseGuards(JwtAuth)
    async Search(@Param('data') data: string, @Req() req: Request & {user: UserDto}) : Promise<string[]> {
        let users : UserDto[] = await this.user.getUserWith(data);
        let searchResult : string[] = []
        if (users) {
            users.forEach((user)=> {
                searchResult.push(user.username)
            })
        }
        return searchResult
    }
}