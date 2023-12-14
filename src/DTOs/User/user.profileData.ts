import { UserDto } from "./user.dto";
import { AchievementDto } from "../achievement/achievement.dto";
import { matchModel } from "../Match/match.model";


export class UserData {

    // user data
    userData : UserDto
    // user matches
    matches : matchModel[]

    achievements : AchievementDto[]
}