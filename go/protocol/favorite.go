// Auto-generated by avdl-compiler v1.2.0 (https://github.com/keybase/node-avdl-compiler)
//   Input file: avdl/favorite.avdl

package keybase1

import (
	rpc "github.com/keybase/go-framed-msgpack-rpc"
	context "golang.org/x/net/context"
)

type Folder struct {
	Name            string `codec:"name" json:"name"`
	Private         bool   `codec:"private" json:"private"`
	NotificationsOn bool   `codec:"notificationsOn" json:"notificationsOn"`
}

type FavoriteAddArg struct {
	SessionID int    `codec:"sessionID" json:"sessionID"`
	Folder    Folder `codec:"folder" json:"folder"`
}

type FavoriteDeleteArg struct {
	SessionID int    `codec:"sessionID" json:"sessionID"`
	Folder    Folder `codec:"folder" json:"folder"`
}

type FavoriteListArg struct {
	SessionID int `codec:"sessionID" json:"sessionID"`
}

type FavoriteInterface interface {
	FavoriteAdd(context.Context, FavoriteAddArg) error
	FavoriteDelete(context.Context, FavoriteDeleteArg) error
	FavoriteList(context.Context, int) ([]Folder, error)
}

func FavoriteProtocol(i FavoriteInterface) rpc.Protocol {
	return rpc.Protocol{
		Name: "keybase.1.favorite",
		Methods: map[string]rpc.ServeHandlerDescription{
			"favoriteAdd": {
				MakeArg: func() interface{} {
					ret := make([]FavoriteAddArg, 1)
					return &ret
				},
				Handler: func(ctx context.Context, args interface{}) (ret interface{}, err error) {
					typedArgs, ok := args.(*[]FavoriteAddArg)
					if !ok {
						err = rpc.NewTypeError((*[]FavoriteAddArg)(nil), args)
						return
					}
					err = i.FavoriteAdd(ctx, (*typedArgs)[0])
					return
				},
				MethodType: rpc.MethodCall,
			},
			"favoriteDelete": {
				MakeArg: func() interface{} {
					ret := make([]FavoriteDeleteArg, 1)
					return &ret
				},
				Handler: func(ctx context.Context, args interface{}) (ret interface{}, err error) {
					typedArgs, ok := args.(*[]FavoriteDeleteArg)
					if !ok {
						err = rpc.NewTypeError((*[]FavoriteDeleteArg)(nil), args)
						return
					}
					err = i.FavoriteDelete(ctx, (*typedArgs)[0])
					return
				},
				MethodType: rpc.MethodCall,
			},
			"favoriteList": {
				MakeArg: func() interface{} {
					ret := make([]FavoriteListArg, 1)
					return &ret
				},
				Handler: func(ctx context.Context, args interface{}) (ret interface{}, err error) {
					typedArgs, ok := args.(*[]FavoriteListArg)
					if !ok {
						err = rpc.NewTypeError((*[]FavoriteListArg)(nil), args)
						return
					}
					ret, err = i.FavoriteList(ctx, (*typedArgs)[0].SessionID)
					return
				},
				MethodType: rpc.MethodCall,
			},
		},
	}
}

type FavoriteClient struct {
	Cli rpc.GenericClient
}

func (c FavoriteClient) FavoriteAdd(ctx context.Context, __arg FavoriteAddArg) (err error) {
	err = c.Cli.Call(ctx, "keybase.1.favorite.favoriteAdd", []interface{}{__arg}, nil)
	return
}

func (c FavoriteClient) FavoriteDelete(ctx context.Context, __arg FavoriteDeleteArg) (err error) {
	err = c.Cli.Call(ctx, "keybase.1.favorite.favoriteDelete", []interface{}{__arg}, nil)
	return
}

func (c FavoriteClient) FavoriteList(ctx context.Context, sessionID int) (res []Folder, err error) {
	__arg := FavoriteListArg{SessionID: sessionID}
	err = c.Cli.Call(ctx, "keybase.1.favorite.favoriteList", []interface{}{__arg}, &res)
	return
}
