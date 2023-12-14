import { IsString } from "class-validator";


export class UserDto {

    @IsString()
    id : string;
    
    @IsString()
    username : string;

    @IsString()
    email ? :    string;

    avatar : string;

    achievements : string[];

    TwoFASecret: string;

    IsEnabled: boolean;

    bandUsers : string[];

    online  :    boolean;

    level : number;
}

export class TwoFaV {

    code: string;
}