import { useModalManager } from "@/service/ModalManager";
import { useSharedValue } from "@/service/SharedPageDataManager";


const PortraitContent: React.FC = () => {
    const lobbyHeadDimension = useSharedValue("lobby.head.dimension");
    const { openModal } = useModalManager();
    if (lobbyHeadDimension == null) return null;
    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div style={{ position: "absolute", top: lobbyHeadDimension.height + 10, left: "50%", transform: "translateX(-50%)", width: "95%", height: "100%" }}>
                <div style={{ position: "relative", height: "50%", width: "100%", backgroundColor: "red" }}>
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", position: "absolute", bottom: 0, left: 0, width: "100%", height: "25%" }}>
                        <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "80px", height: "45px", backgroundColor: "blue", color: "white" }} onClick={() => openModal({ name: "join_tournament", effect: { name: "swipeTop", args: { height: "100%" } } })}>JOIN</div>
                        <div
                            style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "80px", height: "45px", backgroundColor: "green", color: "white" }}
                            onClick={() => openModal({ name: "tournament_history", effect: { name: "swipeBottom", args: { height: "100%" } } })}
                        >
                            RECORD
                        </div>
                    </div>
                </div>
                <div style={{ height: "25%", width: "100%", backgroundColor: "blue" }}>
                    <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "80px", height: "45px", backgroundColor: "green", color: "white" }} onClick={() => openModal({ name: "play_solitaire_solo", effect: { name: "popCenter", args: { width: "100%", height: "100%" } } })}>Solitaire</div>
                    <div style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", width: "80px", height: "45px", backgroundColor: "green", color: "white" }} onClick={() => openModal({ name: "play_block_blast", effect: { name: "popCenter", args: { width: "100%", height: "100%" } } })}>Block Blast</div>
                </div>
                <div style={{ height: "25%", width: "100%", backgroundColor: "green" }}></div>
                <div style={{ height: "25%", width: "100%", backgroundColor: "yellow" }}></div>
                <div style={{ height: "25%", width: "100%", backgroundColor: "purple" }}></div>
            </div>

        </div>
    )
}
export default PortraitContent;