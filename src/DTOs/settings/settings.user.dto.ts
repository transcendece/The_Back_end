export class UserSettingsDto {

    constructor () {
        this.user = "";
        this.bandUsers = [];
        this.friends = [];
        this.invitations = [];
    }
    user        : string;
    invitations : string[];
    friends     : string[];
    bandUsers   : string[];
}